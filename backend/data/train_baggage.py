import os, json
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
import joblib

os.chdir("/app/backend/data")
os.makedirs("/app/backend/models", exist_ok=True)

def dur_to_min(s):
    try:
        h, m, sec = str(s).split(":"); return int(h) * 60 + int(m) + int(sec) / 60
    except Exception:
        return np.nan

print("loading...")
bag = pd.read_excel("baggage_data.xlsx")
fs = pd.read_excel("flight_schedule.xlsx")
fs["Date"] = pd.to_datetime(fs["Date"]).dt.date

bag["first_min"] = bag["Duration Onblock To First Bag"].apply(dur_to_min)
bag["last_min"] = bag["Duration Onblock To Last Bag"].apply(dur_to_min)
bag["sta_dt"] = pd.to_datetime(bag["STA"], format="%d.%m.%Y %H:%M:%S", errors="coerce")
bag["date"] = bag["sta_dt"].dt.date
bag["hour"] = bag["sta_dt"].dt.hour
bag = bag.dropna(subset=["first_min", "last_min", "hour"])

fs_small = fs[["Date", "Flight No.", "Passengers", "Luggage (kg)"]].rename(
    columns={"Date": "date", "Flight No.": "Flight Number", "Passengers": "passengers", "Luggage (kg)": "luggage_kg"})
df = bag.merge(fs_small, on=["date", "Flight Number"], how="left")
df["passengers"] = df["passengers"].fillna(df["passengers"].median())
df["luggage_kg"] = df["luggage_kg"].fillna(df["luggage_kg"].median())
df["is_international"] = (df["Category"].astype(str).str.upper() == "INT").astype(int)

handlers = sorted(df["Ground Handlers"].dropna().astype(str).unique().tolist())
for h in handlers:
    df[f"gh_{h}"] = (df["Ground Handlers"].astype(str) == h).astype(int)

df = df[(df["first_min"] > 0) & (df["first_min"] < 60) & (df["last_min"] > df["first_min"]) & (df["last_min"] < 120)]
if len(df) > 60000:
    df = df.sample(60000, random_state=42)
print("train rows:", len(df))

feat_cols = ["passengers", "luggage_kg", "is_international", "hour"] + [f"gh_{h}" for h in handlers]
X = df[feat_cols].values
y_first = df["first_min"].values
y_last = df["last_min"].values

def gbr(alpha):
    return GradientBoostingRegressor(loss="quantile", alpha=alpha, n_estimators=140,
                                     max_depth=3, learning_rate=0.08, subsample=0.8, random_state=42)

print("training first p50...")
m_first = gbr(0.5).fit(X, y_first)
print("training first p10...")
m_first_lo = gbr(0.1).fit(X, y_first)
print("training last p50...")
m_last = gbr(0.5).fit(X, y_last)
print("training last p90...")
m_last_hi = gbr(0.9).fit(X, y_last)

pf = m_first.predict(X[:2000]); pl = m_last_hi.predict(X[:2000])
print("first p50 range", round(pf.min(),1), round(pf.max(),1), "| last p90 range", round(pl.min(),1), round(pl.max(),1))
print("last-first mean diff", round((pl.mean()-pf.mean()),1))

joblib.dump({"first_p50": m_first, "first_p10": m_first_lo, "last_p50": m_last, "last_p90": m_last_hi,
             "handlers": handlers, "feat_cols": feat_cols}, "/app/backend/models/baggage_gbr.joblib")
print("SAVED /app/backend/models/baggage_gbr.joblib")

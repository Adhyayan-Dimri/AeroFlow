import datetime as dt
import requests
from dotenv import dotenv_values

B = dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
s = requests.Session()
print("login", s.post(f"{B}/auth/login", json={"email": "adhyayan02@icloud.com", "password": "AeroFlow@2026"}, timeout=30).status_code)

def iso(v):
    return dt.datetime.fromisoformat(v.replace("Z", "+00:00"))

asg = requests.get(f"{B}/baggage/assignments", timeout=60).json()["assignments"]
row = next(a for a in asg if a["flight"]["flight_number"] == "6E813")
fid = row["flight_id"]
for d in (0, 11, 0):
    r = s.post(f"{B}/baggage/flights/{fid}/delay", json={"additional_minutes": d}, timeout=30)
    pred = s.get(f"{B}/baggage/flights/{fid}/prediction", timeout=30).json()
    a = next(x for x in requests.get(f"{B}/baggage/assignments", timeout=60).json()["assignments"] if x["flight_id"] == fid)
    f, l = iso(pred["predicted_first_bag_time"]), iso(pred["predicted_last_bag_time"])
    ws, we = iso(a["window_start"]), iso(a["window_end"])
    print(f"delay={d:>3} post={r.status_code} first={f.time()} last={l.time()} pred_width={(l-f).total_seconds()/60:.0f}m "
          f"win={ws.time()}->{we.time()} win_width={(we-ws).total_seconds()/60:.0f}m staff_delay={pred.get('staff_added_delay_minutes')}")

for a in requests.get(f"{B}/baggage/assignments", timeout=60).json()["assignments"]:
    p = s.get(f"{B}/baggage/flights/{a['flight_id']}/prediction", timeout=30).json()
    if p.get("staff_added_delay_minutes"):
        print("reset", a["flight"]["flight_number"], p["staff_added_delay_minutes"],
              s.post(f"{B}/baggage/flights/{a['flight_id']}/delay", json={"additional_minutes": 0}, timeout=30).status_code)
print("done")

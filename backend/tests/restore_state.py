import requests, collections, datetime
from dotenv import dotenv_values
B = dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
s = requests.Session()
r = s.post(f"{B}/auth/login", json={"email": "adhyayan02@icloud.com", "password": "AeroFlow@2026"}, timeout=30)
print("login", r.status_code)

for zid, c in [("security-dom", 10), ("checkin-dom-a", 14), ("checkin-dom-b", 12)]:
    print(zid, s.post(f"{B}/congestion/zones/{zid}/staffing-recommendation", json={"counters_open": c}, timeout=30).json())

asg = requests.get(f"{B}/baggage/assignments", timeout=60).json()["assignments"]
for a in asg:
    p = requests.get(f"{B}/baggage/flights/{a['flight_id']}/prediction", timeout=30).json()
    if p.get("staff_added_delay_minutes"):
        print("reset delay", a["flight"]["flight_number"], p["staff_added_delay_minutes"],
              s.post(f"{B}/baggage/flights/{a['flight_id']}/delay", json={"additional_minutes": 0}, timeout=30).status_code)

for c in s.get(f"{B}/admin/carousels", timeout=30).json()["carousels"]:
    if c["carousel_number"] in ("AC-01",) and c["status"] != "free":
        print("restore", c["carousel_number"], s.patch(f"{B}/admin/carousels/{c['carousel_id']}", json={"status": "free"}, timeout=30).status_code)

d = requests.get(f"{B}/analytics/congestion", params={"range": "1h"}, timeout=60).json()["series"]
print("1h buckets:", sorted({x["bucket"] for x in d}))
print("utcnow:", datetime.datetime.utcnow().isoformat())

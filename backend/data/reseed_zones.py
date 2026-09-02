import asyncio, sys
from pathlib import Path
sys.path.insert(0, "/app/backend")
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
from database import db, now
from seed import ZONES
import engines

async def main():
    for z in ZONES:
        await db.zones.update_one({"zone_id": z["zone_id"]}, {"$set": {
            "counters_open": z["counters_open"], "capacity": z["capacity"],
            "threshold_normal_max": z["threshold_normal_max"], "threshold_medium_max": z["threshold_medium_max"],
            "avg_service_seconds_per_passenger": z["avg_service_seconds_per_passenger"]}})
    print("zones updated", len(ZONES))
    z = await db.zones.find_one({"zone_id": "security-dom"}, {"_id": 0})
    fl = await db.flights.find({}, {"_id": 0}).to_list(2000)
    base = now().replace(minute=0, second=0, microsecond=0)
    for h in range(0, 24, 2):
        t = base.replace(hour=h)
        p = engines.predict_zone(z, fl, t, 2.0, t)
        print(f"{h:02d}:00 count {p['predicted_count']:6} wait_min {round(p['predicted_wait_seconds']/60,1):5} {p['crowd_level']}")

asyncio.run(main())

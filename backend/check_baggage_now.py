import asyncio
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport
from server import app
from database import db, now, iso, parse_dt

async def main():
    transport = ASGITransport(app=app)
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}
    async with AsyncClient(transport=transport, base_url="http://test", headers=headers) as ac:
        current_time = now()
        print("Backend NOW:", iso(current_time))

        arrivals = await db.flights.find({"direction": "arrival"}, {"_id": 0}).sort("sta", 1).to_list(1000)
        print(f"\nTotal arrivals in DB: {len(arrivals)}")

        near_arrivals = []
        for f in arrivals:
            dt = parse_dt(f.get("sta"))
            if dt and abs((dt - current_time).total_seconds()) < 7200:
                near_arrivals.append(f)

        print(f"\nArrivals near current time (±2 hours, count: {len(near_arrivals)}):")
        for f in near_arrivals:
            t = f.get("sta")
            c = f.get("carousel_number")
            fid = f.get("flight_id")
            bag = await db.baggage_predictions.find_one({"flight_id": fid}, {"_id": 0})
            first_bag = bag.get("first_bag_time") if bag else "None"
            last_bag = bag.get("last_bag_time") if bag else "None"
            print(f"  Flight: {f['flight_number']:<6} | STA: {t} | Belt: {c} | FirstBag: {first_bag} | LastBag: {last_bag}")

        res = await ac.get("/api/baggage/assignments")
        assignments = res.json().get("assignments", [])
        print(f"\n/api/baggage/assignments returned {len(assignments)} assignments:")
        for a in assignments[:8]:
            print(f"  Belt: {a.get('carousel_number'):<6} | Flight: {a.get('flight_number'):<6} | Status: {a.get('status')} | First: {a.get('first_bag_time')}")

if __name__ == "__main__":
    asyncio.run(main())

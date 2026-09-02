import asyncio
from datetime import datetime, timezone
from database import db, now, iso, parse_dt, LOCAL_TZ

async def main():
    n = now()
    print("now():", n, "ISO:", iso(n), "LOCAL_TZ:", LOCAL_TZ)

    sample_flights = await db.flights.find({}, {"_id": 0}).limit(10).to_list(10)
    print("\nSample flights in DB:")
    for f in sample_flights:
        print(f"Flight: {f.get('flight_number')} | Direction: {f.get('direction')} | STD: {f.get('std')} | STA: {f.get('sta')}")

    sample_bags = await db.baggage_predictions.find({}, {"_id": 0}).limit(10).to_list(10)
    print("\nSample baggage in DB:")
    for b in sample_bags:
        fid = b.get('flight_id')
        f = await db.flights.find_one({"flight_id": fid}, {"_id": 0})
        fnum = f.get('flight_number') if f else 'None'
        print(f"Bag fid: {fid} | Flight: {fnum} | First: {b.get('predicted_first_bag_time')} | Last: {b.get('predicted_last_bag_time')}")

if __name__ == "__main__":
    asyncio.run(main())

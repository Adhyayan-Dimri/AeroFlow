import asyncio
from database import db

async def main():
    count = await db.master_flights.count_documents({})
    print("Master flights count:", count)

    arrivals = await db.master_flights.find({"flight_type": "Arrival"}).to_list(100)
    print("Sample master arrivals:")
    for a in arrivals[:10]:
        print(" ", a["flight_number"], a["time"], a["endpoint"])

if __name__ == "__main__":
    asyncio.run(main())

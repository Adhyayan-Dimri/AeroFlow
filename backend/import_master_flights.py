import asyncio
from dotenv import load_dotenv
load_dotenv()

from database import db
import pandas as pd

async def import_master_flights():
    df = pd.read_excel('data/flight_schedule.xlsx')
    print(f'Total flights in spreadsheet: {len(df)}')
    print(f'Date range: {df["Date"].min()} to {df["Date"].max()}')
    print(f'Unique dates: {df["Date"].nunique()}')

    await db.master_flights.delete_many({})

    docs = []
    for _, row in df.iterrows():
        doc = {
            "date": str(row['Date']),
            "flight_number": row['Flight No.'],
            "flight_type": row['Type'],
            "is_international": row['Flight Type'] == 'International',
            "passengers": row['Passengers'],
            "luggage_kg": row['Luggage (kg)'],
            "endpoint": row['Origin/Destination'],
            "time": row['Time']
        }
        docs.append(doc)

    print(f'Generated {len(docs)} flight documents')

    batch_size = 1000
    for i in range(0, len(docs), batch_size):
        batch = docs[i:i+batch_size]
        await db.master_flights.insert_many(batch)
        if i % 10000 == 0:
            print(f'Inserted {i + len(batch)}/{len(docs)} flights')

    print('Import complete!')

    all_flights = await db.master_flights.find({}, {"_id": 0, "date": 1}).to_list(1000)
    dates = set()
    for f in all_flights:
        dates.add(f.get('date'))
    print(f'Unique dates in DB: {len(dates)}')
    print(f'Sample dates: {sorted(list(dates))[:10]}')

asyncio.run(import_master_flights())

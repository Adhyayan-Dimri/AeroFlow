import asyncio
from database import db
from utils import parse_dt, now

async def check():
    assignments = await db.carousel_assignments.find({}, {'_id': 0}).to_list(20)
    print(f'Total assignments: {len(assignments)}')
    for a in assignments[:5]:
        print(f"Carousel: {a.get('carousel_id')}, Start: {a.get('window_start')}, End: {a.get('window_end')}")

asyncio.run(check())

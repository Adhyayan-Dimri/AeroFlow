import asyncio
from database import db
from seed import recompute_baggage_and_carousels, seed_static

async def main():
    c = await db.carousels.count_documents({})
    b = await db.baggage_predictions.count_documents({})
    a = await db.carousel_assignments.count_documents({})
    fl = await db.flights.count_documents({'direction': 'arrival'})
    print('Carousels in DB:', c)
    print('Arrivals in DB:', fl)
    print('Baggage predictions:', b)
    print('Carousel assignments:', a)

    if c == 0:
        print('Carousels table is empty! Seeding static resources...')
        await seed_static(force=True)
        c = await db.carousels.count_documents({})
        print('Carousels now:', c)

    await recompute_baggage_and_carousels()
    b = await db.baggage_predictions.count_documents({})
    a = await db.carousel_assignments.count_documents({})
    print('After recompute -> Baggage predictions:', b, 'Carousel assignments:', a)

if __name__ == "__main__":
    asyncio.run(main())

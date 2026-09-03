import asyncio
import json
import uuid
import sys
import random
import logging
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from database import db, now, iso
from datetime import datetime, timedelta, time
from seed import recompute_baggage_and_carousels, AIRLINES

logger = logging.getLogger(__name__)

async def _get_master_flights():
    master = await db.master_flights.find({}, {"_id": 0}).to_list(300000)
    if not master:
        seed_path = Path(__file__).parent / "seed_data.json"
        if seed_path.exists():
            try:
                with open(seed_path, "r", encoding="utf-8") as f:
                    sdata = json.load(f)
                raw_flights = sdata.get("flights_day", [])
                master = []
                for rf in raw_flights:
                    direction = rf.get("direction", "departure")
                    ftype = "Departure" if direction.lower() == "departure" else "Arrival"
                    master.append({
                        "flight_number": rf["flight_number"],
                        "flight_type": ftype,
                        "is_international": rf.get("is_international", False),
                        "passengers": rf.get("passengers", 180),
                        "luggage_kg": rf.get("luggage_kg", 3000.0),
                        "endpoint": rf.get("endpoint", "Mumbai"),
                        "time": rf.get("time", "12:00"),
                        "date": "2026-09-03"
                    })
                if master:
                    try:
                        await db.master_flights.insert_many(master)
                    except Exception:
                        pass
            except Exception as e:
                logger.warning("Could not parse seed_data.json: %s", e)
    return master

def _airline_for_flight(flight_number: str) -> str:
    code = flight_number[:2].upper() if len(flight_number) >= 2 else "AI"
    return AIRLINES.get(code, "Air India")

async def ensure_flights_for_date(date_str: str):
    if not date_str or len(date_str) < 10:
        return 0
    clean_date = date_str[:10]

    count = await db.flights.count_documents({
        "$or": [
            {"std": {"$regex": f"^{clean_date}"}},
            {"sta": {"$regex": f"^{clean_date}"}}
        ]
    })
    if count >= 10:
        return count

    try:
        target_day = datetime.strptime(clean_date, "%Y-%m-%d").date()
    except Exception as e:
        logger.warning("Invalid date string for flight generation: %s", date_str)
        return 0

    master_flights = await _get_master_flights()
    if not master_flights:
        logger.warning("No master flights available in database to synthesize schedule")
        return 0

    rng = random.Random(f"AeroFlow-{clean_date}")
    by_hour = {}
    for mf in master_flights:
        try:
            h = int(str(mf.get("time", "12:00")).split(":")[0])
        except Exception:
            h = 12
        by_hour.setdefault(h, []).append(mf)

    sampled = []
    for h in range(24):
        h_pool = by_hour.get(h, master_flights)
        arrs = [f for f in h_pool if f.get("flight_type") == "Arrival"]
        deps = [f for f in h_pool if f.get("flight_type") == "Departure"]
        if arrs:
            sampled.extend(rng.sample(arrs, min(6, len(arrs))))
        if deps:
            sampled.extend(rng.sample(deps, min(10, len(deps))))
    day_flights = sampled if sampled else master_flights

    docs = []
    for master in day_flights:
        flight_number = master["flight_number"]
        flight_type = master["flight_type"]
        is_intl = master["is_international"]
        passengers = master["passengers"]
        luggage_kg = master["luggage_kg"]
        endpoint = master["endpoint"]
        time_str = master["time"]

        try:
            hour, minute = map(int, time_str.split(':'))
        except Exception:
            hour, minute = 12, 0

        base = datetime.combine(target_day, time(hour, minute)).replace(tzinfo=now().tzinfo)
        airline_code = flight_number[:2].upper() if len(flight_number) >= 2 else "AI"
        airline_name = AIRLINES.get(airline_code, "Air India")

        doc = {
            "flight_id": str(uuid.uuid4()),
            "flight_number": flight_number,
            "airline_code": airline_code,
            "airline_name": airline_name,
            "direction": "departure" if flight_type == "Departure" else "arrival",
            "is_international": is_intl,
            "category": "INT" if is_intl else "DOM",
            "passengers": passengers,
            "luggage_kg": luggage_kg,
            "endpoint": endpoint,
            "origin": endpoint if flight_type == "Arrival" else "Delhi (DEL)",
            "destination": endpoint if flight_type == "Departure" else "Delhi (DEL)",
            "aircraft_type": "Wide-body" if passengers > 260 else "Narrow-body",
            "gate": f"{'B' if is_intl else 'A'}{random.randint(1, 28)}",
            "stand": f"S{random.randint(1, 45)}",
            "terminal": "T3",
            "ground_handler": "AI SATS" if is_intl else "Celebi Ground Handling",
            "staff_added_delay_minutes": 0,
            "status": "Scheduled",
        }

        if flight_type == "Departure":
            doc["std"] = iso(base)
            doc["etd"] = iso(base)
            doc["atd"] = None
            doc["sta"] = None
        else:
            doc["sta"] = iso(base)
            doc["std"] = iso(base)
            doc["eta"] = iso(base)
            doc["ata"] = iso(base)

        docs.append(doc)

    if docs:
        await db.flights.insert_many(docs)
        await recompute_baggage_and_carousels()
        logger.info("Successfully synthesized and indexed %d flights for %s", len(docs), clean_date)
    return len(docs)

async def seed_from_master(specific_dates=None):
    if specific_dates:
        date_list = [datetime.strptime(d, "%Y-%m-%d").date() for d in specific_dates]
    else:
        today = now().date()
        date_list = [today + timedelta(days=off) for off in range(-1, 7)]

    master_flights = await _get_master_flights()
    if not master_flights:
        logger.warning("No master flights available to seed from master")
        return

    await db.flights.delete_many({})
    docs = []
    for day in date_list:
        clean_date = day.strftime("%Y-%m-%d")
        rng = random.Random(f"AeroFlow-{clean_date}")
        by_hour = {}
        for mf in master_flights:
            try:
                h = int(str(mf.get("time", "12:00")).split(":")[0])
            except Exception:
                h = 12
            by_hour.setdefault(h, []).append(mf)

        sampled = []
        for h in range(24):
            h_pool = by_hour.get(h, master_flights)
            arrs = [f for f in h_pool if f.get("flight_type") == "Arrival"]
            deps = [f for f in h_pool if f.get("flight_type") == "Departure"]
            if arrs:
                sampled.extend(rng.sample(arrs, min(6, len(arrs))))
            if deps:
                sampled.extend(rng.sample(deps, min(10, len(deps))))
        day_flights = sampled if sampled else master_flights

        for master in day_flights:
            flight_number = master["flight_number"]
            flight_type = master["flight_type"]
            is_intl = master["is_international"]
            passengers = master["passengers"]
            luggage_kg = master["luggage_kg"]
            endpoint = master["endpoint"]
            time_str = master["time"]

            try:
                hour, minute = map(int, time_str.split(':'))
            except Exception:
                hour, minute = 12, 0

            base = datetime.combine(day, time(hour, minute)).replace(tzinfo=now().tzinfo)
            airline_code = flight_number[:2].upper() if len(flight_number) >= 2 else "AI"
            airline_name = AIRLINES.get(airline_code, "Air India")

            doc = {
                "flight_id": str(uuid.uuid4()),
                "flight_number": flight_number,
                "airline_code": airline_code,
                "airline_name": airline_name,
                "direction": "departure" if flight_type == "Departure" else "arrival",
                "is_international": is_intl,
                "category": "INT" if is_intl else "DOM",
                "passengers": passengers,
                "luggage_kg": luggage_kg,
                "endpoint": endpoint,
                "origin": endpoint if flight_type == "Arrival" else "Delhi (DEL)",
                "destination": endpoint if flight_type == "Departure" else "Delhi (DEL)",
                "aircraft_type": "Wide-body" if passengers > 260 else "Narrow-body",
                "gate": f"{'B' if is_intl else 'A'}{random.randint(1, 28)}",
                "stand": f"S{random.randint(1, 45)}",
                "terminal": "T3",
                "ground_handler": "AI SATS" if is_intl else "Celebi Ground Handling",
                "staff_added_delay_minutes": 0,
                "status": "Scheduled",
            }

            if flight_type == "Departure":
                doc["std"] = iso(base)
                doc["etd"] = iso(base)
                doc["atd"] = None
                doc["sta"] = None
            else:
                doc["sta"] = iso(base)
                doc["std"] = iso(base)
                doc["eta"] = iso(base)
                doc["ata"] = iso(base)

            docs.append(doc)

    if docs:
        await db.flights.insert_many(docs)
        await recompute_baggage_and_carousels()
        logger.info("Successfully seeded %d flights across %d rolling days", len(docs), len(date_list))

if __name__ == '__main__':
    asyncio.run(seed_from_master())

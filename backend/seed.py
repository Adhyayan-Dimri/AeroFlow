import json
import uuid
import logging
import os
from pathlib import Path
from datetime import datetime, timedelta, time
from dotenv import load_dotenv

load_dotenv()

from database import db, now, iso, parse_dt
import engines

logger = logging.getLogger(__name__)
SEED_FILE = Path(__file__).parent / "seed_data.json"

AIRLINES = {
    "AI": "Air India", "6E": "IndiGo", "UK": "Vistara", "SG": "SpiceJet", "G8": "Go First",
    "QP": "Akasa Air", "EK": "Emirates", "EY": "Etihad", "QR": "Qatar Airways", "SQ": "Singapore Airlines",
    "BA": "British Airways", "LH": "Lufthansa", "AF": "Air France", "CX": "Cathay Pacific",
    "TG": "Thai Airways", "MH": "Malaysia Airlines", "TK": "Turkish Airlines", "UL": "SriLankan",
    "AC": "Air Canada", "DL": "Delta", "UA": "United", "KL": "KLM", "OM": "MIAT",
}

ZONES = [
    {"zone_id": "checkin-dom-a", "zone_type": "checkin", "name": "Check-in Island A · Domestic", "terminal": "T3",
     "serves_international": False, "counters_open": 14, "capacity": 45, "avg_service_seconds_per_passenger": 90,
     "distance_from_entry_meters": 250, "threshold_normal_max": 180, "threshold_medium_max": 380},
    {"zone_id": "checkin-dom-b", "zone_type": "checkin", "name": "Check-in Island B · Domestic", "terminal": "T3",
     "serves_international": False, "counters_open": 12, "capacity": 45, "avg_service_seconds_per_passenger": 90,
     "distance_from_entry_meters": 300, "threshold_normal_max": 180, "threshold_medium_max": 380},
    {"zone_id": "checkin-intl", "zone_type": "checkin", "name": "Check-in Island C · International", "terminal": "T3",
     "serves_international": True, "counters_open": 18, "capacity": 60, "avg_service_seconds_per_passenger": 120,
     "distance_from_entry_meters": 320, "threshold_normal_max": 220, "threshold_medium_max": 450},
    {"zone_id": "security-dom", "zone_type": "security", "name": "Security Screening · Domestic", "terminal": "T3",
     "serves_international": False, "counters_open": 10, "capacity": 30, "avg_service_seconds_per_passenger": 45,
     "distance_from_entry_meters": 480, "threshold_normal_max": 200, "threshold_medium_max": 420},
    {"zone_id": "security-intl", "zone_type": "security", "name": "Security Screening · International", "terminal": "T3",
     "serves_international": True, "counters_open": 8, "capacity": 24, "avg_service_seconds_per_passenger": 50,
     "distance_from_entry_meters": 520, "threshold_normal_max": 180, "threshold_medium_max": 360},
    {"zone_id": "emigration", "zone_type": "immigration", "name": "Emigration · Outbound", "terminal": "T3",
     "serves_international": True, "counters_open": 32, "capacity": 100, "avg_service_seconds_per_passenger": 60,
     "distance_from_entry_meters": 650, "threshold_normal_max": 250, "threshold_medium_max": 500},
    {"zone_id": "gate-dom", "zone_type": "gate", "name": "Boarding Concourse · Domestic", "terminal": "T3",
     "serves_international": False, "counters_open": 12, "capacity": 40, "avg_service_seconds_per_passenger": 15,
     "distance_from_entry_meters": 820, "threshold_normal_max": 450, "threshold_medium_max": 900},
    {"zone_id": "gate-intl", "zone_type": "gate", "name": "Boarding Concourse · International", "terminal": "T3",
     "serves_international": True, "counters_open": 10, "capacity": 36, "avg_service_seconds_per_passenger": 18,
     "distance_from_entry_meters": 920, "threshold_normal_max": 400, "threshold_medium_max": 850},
    {"zone_id": "immigration-arr", "zone_type": "immigration", "name": "Immigration · Inbound (Arrivals)", "terminal": "T3",
     "serves_international": True, "counters_open": 36, "capacity": 106, "avg_service_seconds_per_passenger": 55,
     "distance_from_entry_meters": 0, "threshold_normal_max": 280, "threshold_medium_max": 550},
]

def get_invite_codes():
    codes_str = os.environ.get("STAFF_INVITE_CODES", "")
    if codes_str:
        codes = []
        for item in codes_str.split(","):
            if ":" in item:
                code, role = item.split(":", 1)
                codes.append({"code": code.strip(), "role": role.strip()})
        return codes if codes else [
            {"code": "AERO-ADMIN-2026", "role": "admin"},
            {"code": "AERO-OPS-2026", "role": "ops_manager"},
            {"code": "AERO-GROUND-2026", "role": "ground_staff"},
            {"code": "GROUND-STAFF-2026", "role": "ground_staff"},
            {"code": "AERO-STAFF-2026", "role": "ground_staff"},
            {"code": "AERO-SEC-2026", "role": "security_lead"},
            {"code": "AERO-BAG-2026", "role": "baggage_ops"},
            {"code": "AERO-STAFF-01", "role": "ops_manager"},
            {"code": "AERO-STAFF-02", "role": "baggage_ops"},
        ]
    return [
        {"code": "AERO-ADMIN-2026", "role": "admin"},
        {"code": "AERO-OPS-2026", "role": "ops_manager"},
        {"code": "AERO-GROUND-2026", "role": "ground_staff"},
        {"code": "GROUND-STAFF-2026", "role": "ground_staff"},
        {"code": "AERO-STAFF-2026", "role": "ground_staff"},
        {"code": "AERO-SEC-2026", "role": "security_lead"},
        {"code": "AERO-BAG-2026", "role": "baggage_ops"},
        {"code": "AERO-STAFF-01", "role": "ops_manager"},
        {"code": "AERO-STAFF-02", "role": "baggage_ops"},
    ]

INVITE_CODES = get_invite_codes()

def _load():
    with open(SEED_FILE) as f:
        return json.load(f)

def _airline_of(fn):
    code = fn[:2].upper()
    return code, AIRLINES.get(code, code)

async def seed_static(force=False):
    data = _load()
    await db.config.update_one({"_id": "bag_stats"}, {"$set": {"value": data["bag_stats"]}}, upsert=True)
    await db.config.update_one({"_id": "ground_handlers"}, {"$set": {"value": data["ground_handlers"]}}, upsert=True)
    await db.config.update_one({"_id": "staffing"}, {"$set": {"value": data["staffing"]}}, upsert=True)
    await db.config.update_one({"_id": "holidays"}, {"$set": {"value": data["holidays"]}}, upsert=True)

    if force or await db.retrieval_curve.count_documents({}) == 0:
        await db.retrieval_curve.delete_many({})
        await db.retrieval_curve.insert_many([dict(x) for x in data["retrieval_curve"]])

    if force or await db.zones.count_documents({}) == 0:
        await db.zones.delete_many({})
        await db.zones.insert_many([dict(z) for z in ZONES])

    if force or await db.carousels.count_documents({}) == 0:
        await db.carousels.delete_many({})
        docs = []
        for i, c in enumerate(data["carousels"]):
            docs.append({"carousel_id": str(uuid.uuid4()), "carousel_number": c["carousel_number"],
                         "terminal": "T3", "capacity": 1,
                         "status": "free",
                         "length_m": c["length_m"], "speed_mps": c["speed_mps"], "updated_at": iso(now())})
        await db.carousels.insert_many(docs)

    await recompute_baggage_and_carousels()

    for c in INVITE_CODES:
        await db.staff_invite_codes.update_one(
            {"code": c["code"]}, {"$setOnInsert": {"code": c["code"], "role": c["role"], "used_by": None, "used_at": None}}, upsert=True)

async def seed_flights_for_today(force=False):
    curr = now()
    upcoming_count = await db.flights.count_documents({
        "$or": [
            {"std": {"$gte": iso(curr)}},
            {"sta": {"$gte": iso(curr)}}
        ]
    })
    if force or upcoming_count < 10:
        logger.info("Seeding dynamic rolling flight schedules from master...")
        try:
            from seed_from_master import seed_from_master
            await seed_from_master()
        except Exception as e:
            logger.error("Failed to seed from master: %s", e)

async def recompute_baggage_and_carousels():
    data = _load()
    bag_stats = data["bag_stats"]
    arrivals = await db.flights.find({"direction": "arrival"}, {"_id": 0}).to_list(3000)
    carousels = await db.carousels.find({}, {"_id": 0}).to_list(100)
    windows = []
    pred_by_flight = {}
    for f in arrivals:
        p = engines.predict_baggage(f, bag_stats)
        if not p:
            continue
        pred_by_flight[f["flight_id"]] = p
        windows.append({"flight_id": f["flight_id"], "window_start": p["predicted_first_bag_time"],
                        "window_end": p["predicted_last_bag_time"]})
    assignments = engines.allocate_carousels(windows, carousels)
    await db.carousel_assignments.delete_many({})
    await db.baggage_predictions.delete_many({})
    cid_to_num = {c["carousel_id"]: c["carousel_number"] for c in carousels}
    asg_by_flight = {a["flight_id"]: a for a in assignments}
    bag_docs, asg_docs = [], []
    for fid, p in pred_by_flight.items():
        a = asg_by_flight.get(fid, {})
        cid = a.get("carousel_id")
        cnum = cid_to_num.get(cid, "TBD") if cid else "TBD"
        status = a.get("status", "yet_to_assign")
        bag_docs.append({
            "id": str(uuid.uuid4()), "flight_id": fid, "carousel_id": cid,
            "carousel_number": cnum, "bag_count": p.get("bag_count"),
            "predicted_first_bag_time": iso(p["predicted_first_bag_time"]),
            "predicted_last_bag_time": iso(p["predicted_last_bag_time"]),
            "staff_added_delay_minutes": 0, "predicted_at": iso(now()), "confidence": p["confidence"]})
        if a.get("window_start"):
            asg_docs.append({
                "id": str(uuid.uuid4()), "flight_id": fid, "carousel_id": cid,
                "carousel_number": cnum,
                "window_start": iso(a["window_start"]), "window_end": iso(a["window_end"]),
                "assigned_at": iso(now()), "status": status, "version": 0})
    if bag_docs:
        await db.baggage_predictions.insert_many(bag_docs)
    if asg_docs:
        await db.carousel_assignments.insert_many(asg_docs)
    logger.info("Baggage recompute: %d predictions, %d assignments", len(bag_docs), len(asg_docs))

async def seed_all(force=False):
    await seed_static(force=force)
    await seed_flights_for_today(force=force)

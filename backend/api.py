import os
import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, Response, Query
from pydantic import BaseModel, EmailStr, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import db, now, iso, parse_dt
from auth import get_current_user, require_staff, encrypt_data, decrypt_data
import engines
import maps_service
import email_service
import sms_service
import whatsapp_service
from seed_from_master import ensure_flights_for_date

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["api"])

BOARDING_BUFFER_MIN = 25
SLA_FIRST_BAG = {"DOM": 20, "INT": 35}

class FlightPreferenceIn(BaseModel):
    flight_id: str

@router.post("/user/saved-flights")
async def save_flight(body: FlightPreferenceIn, user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    await db.user_preferences.update_one(
        {"user_id": user_id},
        {"$addToSet": {"saved_flights": body.flight_id}},
        upsert=True
    )
    return {"ok": True}

@router.delete("/user/saved-flights/{flight_id}")
async def unsave_flight(flight_id: str, user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    await db.user_preferences.update_one(
        {"user_id": user_id},
        {"$pull": {"saved_flights": flight_id}}
    )
    return {"ok": True}

@router.get("/user/saved-flights")
async def get_saved_flights(user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    pref = await db.user_preferences.find_one({"user_id": user_id}, {"_id": 0})
    saved_ids = pref.get("saved_flights", []) if pref else []
    if not saved_ids:
        return {"flights": []}
    flights = await db.flights.find({"flight_id": {"$in": saved_ids}}, {"_id": 0}).to_list(50)
    return {"flights": flights}

@router.post("/user/recently-viewed")
async def add_recently_viewed(body: FlightPreferenceIn, user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    await db.user_preferences.update_one(
        {"user_id": user_id},
        {"$pull": {"recently_viewed": body.flight_id}}
    )
    await db.user_preferences.update_one(
        {"user_id": user_id},
        {"$push": {"recently_viewed": {"$each": [body.flight_id], "$position": 0, "$slice": 10}}},
        upsert=True
    )
    return {"ok": True}

@router.get("/user/recently-viewed")
async def get_recently_viewed(user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    pref = await db.user_preferences.find_one({"user_id": user_id}, {"_id": 0})
    recent_ids = pref.get("recently_viewed", []) if pref else []
    if not recent_ids:
        return {"flights": []}
    flights = await db.flights.find({"flight_id": {"$in": recent_ids}}, {"_id": 0}).to_list(10)
    return {"flights": flights}

@router.delete("/user/recently-viewed")
async def clear_recently_viewed(user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    await db.user_preferences.update_one(
        {"user_id": user_id},
        {"$set": {"recently_viewed": []}},
        upsert=True
    )
    return {"ok": True, "message": "Recently viewed flights cleared"}

@router.post("/user/recently-viewed/clear")
async def clear_recently_viewed_post(user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    await db.user_preferences.update_one(
        {"user_id": user_id},
        {"$set": {"recently_viewed": []}},
        upsert=True
    )
    return {"ok": True, "message": "Recently viewed flights cleared"}

@router.get("/user/preferences")
async def get_user_preferences(user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    pref = await db.user_preferences.find_one({"user_id": user_id}, {"_id": 0})
    return {
        "saved_flights": pref.get("saved_flights", []) if pref else [],
        "recently_viewed": pref.get("recently_viewed", []) if pref else []
    }

async def _bag_stats():
    doc = await db.config.find_one({"_id": "bag_stats"})
    return doc["value"] if doc else {}

async def _curve():
    return await db.retrieval_curve.find({}, {"_id": 0}).to_list(100)

@router.get("/flights/search")
async def search_flights(number: str | None = None, direction: str | None = None,
                         intl: bool | None = None, period: str | None = None,
                         date: str | None = None, limit: int = 40):
    if date:
        await ensure_flights_for_date(date)

    q = {}
    if number:
        q["$or"] = [
            {"flight_number": {"$regex": number.upper(), "$options": "i"}},
            {"endpoint": {"$regex": number, "$options": "i"}},
            {"origin": {"$regex": number, "$options": "i"}},
            {"destination": {"$regex": number, "$options": "i"}},
            {"airline_name": {"$regex": number, "$options": "i"}},
        ]
    if direction:
        q["direction"] = direction
    if intl is not None:
        q["is_international"] = intl

    if date:
        date_q = [
            {"std": {"$regex": f"^{date}"}},
            {"sta": {"$regex": f"^{date}"}}
        ]
        if "$or" in q:
            q["$and"] = [{"$or": q.pop("$or")}, {"$or": date_q}]
        else:
            q["$or"] = date_q
    elif not number:
        today_str = now().strftime("%Y-%m-%d")
        q["$or"] = [
            {"std": {"$regex": f"^{today_str}"}},
            {"sta": {"$regex": f"^{today_str}"}}
        ]

    flights = await db.flights.find(q, {"_id": 0}).to_list(5000)
    current_time = now()

    if number:

        today_str = current_time.strftime("%Y-%m-%d")
        def search_rank(f):
            dt = parse_dt(f.get("std") or f.get("sta"))
            if not dt:
                return (4, 0)
            delta = (dt - current_time).total_seconds()
            f_date = dt.strftime("%Y-%m-%d")
            is_today = (f_date == today_str)

            if is_today:
                if delta >= 0:
                    return (0, delta)
                elif delta >= -7200:
                    return (1, -delta)
                else:
                    return (2, -delta)
            else:
                return (3, abs(delta))

        flights.sort(key=search_rank)
    elif date:
        flights.sort(key=lambda f: f.get("std") or f.get("sta") or "")
    else:
        ranges = {"early": (0, 6), "morning": (6, 12), "afternoon": (12, 17), "evening": (17, 21), "night": (21, 24)}
        if period and period != "any" and period in ranges:
            lo, hi = ranges[period]
            flights = [f for f in flights if (dt := parse_dt(f.get("std") or f.get("sta"))) and lo <= dt.hour < hi]
            flights.sort(key=lambda f: f.get("std") or f.get("sta") or "")
        else:

            def is_relevant(f):
                dt = parse_dt(f.get("std") or f.get("sta"))
                if not dt:
                    return False
                return dt >= current_time

            flights = [f for f in flights if is_relevant(f)]
            flights.sort(key=lambda f: f.get("std") or f.get("sta") or "")

    return {"flights": flights[:limit], "count": len(flights)}

@router.get("/flights/{flight_id}")
async def get_flight(flight_id: str):
    f = await db.flights.find_one({"flight_id": flight_id}, {"_id": 0})
    if not f:
        raise HTTPException(status_code=404, detail="Flight not found")
    return f

def _crowd_label(level):
    return {"normal": "Normal", "medium": "Moderate", "heavy": "Heavy Rush"}.get(level, level)

@router.get("/flights/{flight_id}/journey-forecast")
async def journey_forecast(flight_id: str, user_location: Optional[str] = None):
    f = await db.flights.find_one({"flight_id": flight_id}, {"_id": 0})
    if not f:
        raise HTTPException(status_code=404, detail="Flight not found")
    zones = await db.zones.find({}, {"_id": 0}).to_list(100)
    zmap = {z["zone_id"]: z for z in zones}
    all_flights = await db.flights.find({}, {"_id": 0}).to_list(2000)
    cutoff = 2.0

    if f["direction"] == "arrival":
        return await _arrival_forecast(f, zmap, all_flights, cutoff)

    intl = f["is_international"]
    seq = (["checkin-intl", "security-intl", "emigration", "gate-intl"] if intl
           else ["checkin-dom-a", "security-dom", "gate-dom"])
    std = parse_dt(f.get("etd") or f.get("std"))
    steps = []
    prev_dist = 0
    total_wait = 0
    total_walk = 0
    for zid in seq:
        z = zmap[zid]
        pred = engines.predict_zone(z, all_flights, std - timedelta(minutes=45), cutoff, now())
        walk_m = max(0, z["distance_from_entry_meters"] - prev_dist)
        walk_min = round(walk_m / engines.WALK_SPEED_MPS / 60.0, 1)
        prev_dist = z["distance_from_entry_meters"]
        wait_min = round(pred["base_process_min"] + pred["predicted_wait_seconds"] / 60.0, 1)
        total_wait += wait_min
        total_walk += walk_min
        steps.append({
            "zone_id": zid, "zone_type": z["zone_type"], "name": z["name"],
            "wait_minutes": wait_min, "walk_minutes": walk_min,
            "crowd_level": pred["crowd_level"], "crowd_label": _crowd_label(pred["crowd_level"]),
            "counters_open": pred["counters_open"], "recommended_counters": pred["recommended_counters"],
            "mode": pred["mode"],
        })

    travel_time_info = None
    travel_time_min = 45
    if user_location:
        logger.info("Calculating travel time for user location: %s", user_location)
        try:
            travel_time_info = await maps_service.get_travel_time(user_location)
            logger.info("Travel time result: %s", travel_time_info)
            if travel_time_info["status"] == "OK":
                travel_time_min = round(travel_time_info["duration_seconds"] / 60.0, 1)
                logger.info("Using calculated travel time: %s minutes", travel_time_min)
            elif travel_time_info["status"] == "TOO_FAR":
                travel_time_min = round(travel_time_info["duration_seconds"] / 60.0, 1)
                logger.warning("User appears to be in a different city, using fallback travel time: %s minutes", travel_time_min)
            else:
                logger.warning("Travel time calculation failed with status: %s", travel_time_info["status"])
        except Exception as e:
            logger.error("Maps service failed for journey forecast: %s", e)
            travel_time_info = {"status": "ERROR", "error": str(e)}
    else:
        logger.info("No user location provided, using default 45 minutes")

    entry_wait = 4
    total_needed = entry_wait + total_wait + total_walk + travel_time_min + BOARDING_BUFFER_MIN
    suggested_arrival = (std - timedelta(minutes=total_needed)) if std else None

    return {
        "flight": f, "direction": "departure", "is_international": intl,
        "entry_wait_minutes": entry_wait,
        "steps": steps, "total_wait_minutes": round(total_wait, 1), "total_walk_minutes": round(total_walk, 1),
        "boarding_buffer_minutes": BOARDING_BUFFER_MIN,
        "travel_time_minutes": travel_time_min,
        "travel_time_info": travel_time_info,
        "total_journey_minutes": round(total_needed, 1),
        "suggested_airport_arrival": iso(suggested_arrival),
        "std": f.get("std"), "etd": f.get("etd"),
    }

async def _arrival_forecast(f, zmap, all_flights, cutoff):
    bag_stats = await _bag_stats()
    p = engines.predict_baggage(f, bag_stats)
    imm = zmap["immigration-arr"]
    imm_pred = None
    steps = []
    if f["is_international"]:
        ata = parse_dt(f.get("ata") or f.get("sta"))
        imm_pred = engines.predict_zone(imm, all_flights, ata + timedelta(minutes=10) if ata else now(), cutoff, now())
        steps.append({
            "zone_id": "immigration-arr", "zone_type": "immigration", "name": imm["name"],
            "wait_minutes": round(imm_pred["base_process_min"] + imm_pred["predicted_wait_seconds"] / 60.0, 1), "walk_minutes": 6,
            "crowd_level": imm_pred["crowd_level"], "crowd_label": _crowd_label(imm_pred["crowd_level"]),
            "counters_open": imm_pred["counters_open"], "recommended_counters": imm_pred["recommended_counters"],
            "mode": imm_pred["mode"],
        })
    bag = await db.baggage_predictions.find_one({"flight_id": f["flight_id"]}, {"_id": 0})
    baggage = None
    if bag:
        baggage = {
            "first_bag_time": bag["predicted_first_bag_time"],
            "last_bag_time": bag["predicted_last_bag_time"],
            "staff_added_delay_minutes": bag.get("staff_added_delay_minutes", 0),
            "bag_count": bag.get("bag_count"),
            "confidence": bag.get("confidence"),
        }
    return {"flight": f, "direction": "arrival", "is_international": f["is_international"],
            "steps": steps, "baggage": baggage, "sta": f.get("sta"), "ata": f.get("ata")}

class NotifyPrefs(BaseModel):
    notify_pre_flight: bool
    notify_whatsapp: bool | None = None
    notify_baggage_belt: bool | None = None
    notify_sms: bool | None = None

class UserProfileUpdate(BaseModel):
    phone: str | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v:
            import re
            v = re.sub(r"[^\d+]", "", v)
            if not re.match(r"^\+?\d{10,15}$", v):
                raise HTTPException(status_code=400, detail="Invalid phone number format")
        return v

@router.patch("/users/me")
async def update_profile(body: UserProfileUpdate, user: dict = Depends(get_current_user)):
    update_data = {}
    if body.phone is not None:
        encrypted_phone = encrypt_data(body.phone) if body.phone else None
        update_data["phone"] = encrypted_phone

    if update_data:
        await db.users.update_one({"_id": user["_id"]}, {"$set": update_data})

    return {"ok": True}

@router.get("/users/me/notify-preferences")
async def get_notify(user: dict = Depends(get_current_user)):
    sms_available = sms_service.configured()
    whatsapp_available = whatsapp_service.configured()

    logger.info("Available channels check - SMS: %s, WhatsApp: %s", sms_available, whatsapp_available)

    return {
        "notify_pre_flight": user.get("notify_pre_flight", False),
        "notify_whatsapp": user.get("notify_whatsapp", False),
        "notify_baggage_belt": user.get("notify_baggage_belt", False),
        "notify_sms": user.get("notify_sms", False),
        "available_channels": {
            "sms": sms_available,
            "whatsapp": whatsapp_available,
            "email": True
        }
    }

@router.get("/notification-channels")
async def get_available_channels():
    sms_available = sms_service.configured()
    whatsapp_available = whatsapp_service.configured()

    return {
        "sms": sms_available,
        "whatsapp": whatsapp_available,
        "email": True
    }

@router.patch("/users/me/notify-preferences")
async def set_notify(body: NotifyPrefs, user: dict = Depends(get_current_user)):
    update_data = {"notify_pre_flight": body.notify_pre_flight}
    if body.notify_whatsapp is not None:
        update_data["notify_whatsapp"] = body.notify_whatsapp
    if body.notify_baggage_belt is not None:
        update_data["notify_baggage_belt"] = body.notify_baggage_belt
    if body.notify_sms is not None:
        update_data["notify_sms"] = body.notify_sms
    await db.users.update_one({"_id": user["_id"]}, {"$set": update_data})
    return {"notify_pre_flight": body.notify_pre_flight, "notify_whatsapp": body.notify_whatsapp, "notify_baggage_belt": body.notify_baggage_belt, "notify_sms": body.notify_sms}

class SaveFlightIn(BaseModel):
    flight_id: str

@router.post("/users/me/saved-flights")
@router.post("/user/saved-flights")
async def save_flight(body: SaveFlightIn, background: BackgroundTasks, user: dict = Depends(get_current_user)):
    f = await db.flights.find_one({"flight_id": body.flight_id}, {"_id": 0})
    if not f:
        raise HTTPException(status_code=404, detail="Flight not found")
    if await db.saved_flights.find_one({"user_id": str(user["_id"]), "flight_id": body.flight_id}):
        return {"ok": True, "already": True}
    await db.saved_flights.insert_one({"id": str(uuid.uuid4()), "user_id": str(user["_id"]),
                                       "flight_id": body.flight_id, "created_at": iso(now())})
    return {"ok": True}

@router.get("/users/me/saved-flights")
@router.get("/user/saved-flights")
async def list_saved(user: dict = Depends(get_current_user)):
    saved = await db.saved_flights.find({"user_id": str(user["_id"])}, {"_id": 0}).to_list(100)
    fids = [s["flight_id"] for s in saved]
    flights = await db.flights.find({"flight_id": {"$in": fids}}, {"_id": 0}).to_list(100)
    return {"flights": flights}

@router.delete("/users/me/saved-flights/{flight_id}")
@router.delete("/user/saved-flights/{flight_id}")
async def del_saved(flight_id: str, user: dict = Depends(get_current_user)):
    await db.saved_flights.delete_one({"user_id": str(user["_id"]), "flight_id": flight_id})
    return {"ok": True}

class NudgeIn(BaseModel):
    flight_id: str

@router.post("/users/me/preflight-nudge")
async def send_nudge(body: NudgeIn, background: BackgroundTasks, user: dict = Depends(get_current_user)):
    jf = await journey_forecast(body.flight_id)
    if jf["direction"] != "departure":
        raise HTTPException(status_code=400, detail="Pre-flight nudge only for departures")
    arrive_by = parse_dt(jf["suggested_airport_arrival"])
    heavy = [s["name"] for s in jf["steps"] if s["crowd_level"] == "heavy"]
    note = ("Expect heavy rush at: " + ", ".join(heavy)) if heavy else "Queues look smooth across your journey."

    background.add_task(email_service.send_preflight_email, user["email"], jf["flight"]["flight_number"],
                        jf.get("etd") or jf.get("std"), iso(arrive_by), note)

    if user.get("notify_sms") and user.get("phone"):
        background.add_task(sms_service.send_preflight_sms, user["phone"], jf["flight"]["flight_number"],
                           jf.get("etd") or jf.get("std"), iso(arrive_by), note)

    if user.get("notify_whatsapp") and user.get("phone"):
        background.add_task(whatsapp_service.send_preflight_whatsapp, user["phone"], jf["flight"]["flight_number"],
                           jf.get("etd") or jf.get("std"), iso(arrive_by), note)

    return {"ok": True, "suggested_airport_arrival": jf["suggested_airport_arrival"], "note": note}

@router.get("/congestion/zones")
async def congestion_zones(target_time: Optional[str] = None, date: Optional[str] = None):
    if date:
        await ensure_flights_for_date(date)
    elif target_time:
        await ensure_flights_for_date(target_time[:10])

    zones = await db.zones.find({}, {"_id": 0}).to_list(100)
    flights = await db.flights.find({}, {"_id": 0}).to_list(3000)
    if target_time:
        t = parse_dt(target_time) or now()
    elif date:
        t = parse_dt(f"{date}T12:00:00Z") or now()
    else:
        t = now()
    out = []
    for z in zones:
        pred = engines.predict_zone(z, flights, t, 2.0, t)
        out.append({**z, **pred})
    return {"zones": out, "target_time": iso(t)}

@router.get("/congestion/zones/{zone_id}/forecast")
async def zone_forecast(zone_id: str, horizon: int = Query(30, description="minutes ahead")):
    z = await db.zones.find_one({"zone_id": zone_id}, {"_id": 0})
    if not z:
        raise HTTPException(status_code=404, detail="Zone not found")
    flights = await db.flights.find({}, {"_id": 0}).to_list(2000)
    series = []
    for m in range(-30, horizon + 1, 5):
        t = now() + timedelta(minutes=m)
        pred = engines.predict_zone(z, flights, t, 2.0, now())
        series.append({"offset_min": m, "timestamp": iso(t), **pred})
    return {"zone": z, "series": series}

class StaffingIn(BaseModel):
    counters_open: int

@router.post("/congestion/zones/{zone_id}/staffing-recommendation")
async def set_staffing(zone_id: str, body: StaffingIn, user: dict = Depends(require_staff)):
    z = await db.zones.find_one({"zone_id": zone_id}, {"_id": 0})
    if not z:
        raise HTTPException(status_code=404, detail="Zone not found")
    c = max(1, min(body.counters_open, z.get("capacity", 60)))
    prev_c = z.get("counters_open", 1)
    diff = c - prev_c

    update_data = {"counters_open": c, "staffed_at": iso(now())}
    is_active_override = False
    staffed_at = z.get("staffed_at")
    if staffed_at:
        import dateutil.parser
        try:
            dt = dateutil.parser.isoparse(staffed_at)
            if now() < dt + timedelta(hours=1):
                is_active_override = True
        except Exception:
            pass

    if not is_active_override:
        update_data["original_counters"] = prev_c

    await db.zones.update_one({"zone_id": zone_id}, {"$set": update_data})

    severity = "critical" if z.get("crowd_level") == "heavy" or diff >= 4 else "warning" if diff > 0 else "info"
    alert_doc = {
        "id": str(uuid.uuid4()),
        "alert_type": "staff_deployment",
        "severity": severity,
        "zone_id": zone_id,
        "title": f"Staff Deployment · {z.get('name')}",
        "message": f"Staffing updated to {c} open counters (adjustment: {diff:+d}) for {z.get('name')} by {user.get('email')}. Floor staff requested to report to active counters immediately.",
        "triggered_at": iso(now()),
        "status": "open",
        "deployed_by": user.get("email"),
        "counters_open": c,
        "diff": diff
    }
    await db.alerts.insert_one(alert_doc)

    await db.audit_log.insert_one({
        "id": str(uuid.uuid4()),
        "action": "staff_deployment",
        "zone_id": zone_id,
        "zone_name": z.get("name"),
        "by": user.get("email"),
        "counters_open": c,
        "diff": diff,
        "at": iso(now())
    })

    return {"zone_id": zone_id, "counters_open": c, "alert_id": alert_doc["id"], "message": alert_doc["message"]}

@router.get("/baggage/flights/{flight_id}/prediction")
async def baggage_pred(flight_id: str, user: dict = Depends(require_staff)):
    bag = await db.baggage_predictions.find_one({"flight_id": flight_id}, {"_id": 0})
    if not bag:
        raise HTTPException(status_code=404, detail="No baggage prediction for this flight")
    return bag

@router.get("/baggage/carousels/{carousel_id}/status")
async def carousel_status(carousel_id: str):
    c = await db.carousels.find_one({"carousel_id": carousel_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Carousel not found")
    asg = await db.carousel_assignments.find({"carousel_id": carousel_id}, {"_id": 0}).to_list(100)
    return {"carousel": c, "assignments": asg}

class DelayIn(BaseModel):
    additional_minutes: int

@router.post("/baggage/flights/{flight_id}/delay")
async def add_baggage_delay(flight_id: str, body: DelayIn, user: dict = Depends(require_staff)):
    f = await db.flights.find_one({"flight_id": flight_id})
    if not f:
        raise HTTPException(status_code=404, detail="Flight not found")
    await db.flights.update_one({"flight_id": flight_id}, {"$set": {"staff_added_delay_minutes": body.additional_minutes}})
    bag = await db.baggage_predictions.find_one({"flight_id": flight_id})
    if bag:
        current_delay = bag.get("staff_added_delay_minutes", 0)
        base_first = parse_dt(bag["predicted_first_bag_time"]) - timedelta(minutes=current_delay)
        base_last = parse_dt(bag["predicted_last_bag_time"]) - timedelta(minutes=current_delay)
        new_first = base_first + timedelta(minutes=body.additional_minutes)
        new_last = base_last + timedelta(minutes=body.additional_minutes)
        await db.baggage_predictions.update_one({"flight_id": flight_id}, {"$set": {
            "staff_added_delay_minutes": body.additional_minutes,
            "predicted_first_bag_time": iso(new_first),
            "predicted_last_bag_time": iso(new_last),
        }})
        await db.carousel_assignments.update_one({"flight_id": flight_id}, {"$set": {
            "window_start": iso(new_first - timedelta(minutes=2)),
            "window_end": iso(new_last + timedelta(minutes=10)),
        }})
    await db.audit_log.insert_one({"id": str(uuid.uuid4()), "action": "baggage_delay", "flight_id": flight_id,
                                   "by": user["email"], "minutes": body.additional_minutes, "at": iso(now())})
    return {"ok": True, "flight_id": flight_id, "additional_minutes": body.additional_minutes}

class FlightDelayIn(BaseModel):
    additional_minutes: int
    reason: Optional[str] = "Operational Adjustment"
    new_status: Optional[str] = "delayed"

@router.post("/admin/flights/{flight_id}/delay")
async def delay_flight(flight_id: str, body: FlightDelayIn, user: dict = Depends(require_staff)):
    f = await db.flights.find_one({"flight_id": flight_id})
    if not f:
        raise HTTPException(status_code=404, detail="Flight not found")

    direction = f.get("direction", "departure")
    curr_delay = f.get("flight_delay_minutes", 0)
    total_delay = curr_delay + body.additional_minutes

    upd = {
        "flight_delay_minutes": total_delay,
        "delay_reason": body.reason or "Operational Adjustment",
        "status": body.new_status or ("delayed" if total_delay > 0 else f.get("status", "scheduled")),
        "updated_at": iso(now())
    }

    if direction == "departure":
        base_std = parse_dt(f.get("std"))
        if base_std:
            new_etd = base_std + timedelta(minutes=total_delay)
            upd["etd"] = iso(new_etd)
    else:
        base_sta = parse_dt(f.get("sta"))
        if base_sta:
            new_eta = base_sta + timedelta(minutes=total_delay)
            upd["eta"] = iso(new_eta)
            upd["ata"] = iso(new_eta)

    await db.flights.update_one({"flight_id": flight_id}, {"$set": upd})

    bag = await db.baggage_predictions.find_one({"flight_id": flight_id})
    if bag:
        bag_base_first = parse_dt(bag.get("predicted_first_bag_time"))
        bag_base_last = parse_dt(bag.get("predicted_last_bag_time"))
        if bag_base_first and bag_base_last:
            new_first = bag_base_first + timedelta(minutes=body.additional_minutes)
            new_last = bag_base_last + timedelta(minutes=body.additional_minutes)
            await db.baggage_predictions.update_one({"flight_id": flight_id}, {"$set": {
                "predicted_first_bag_time": iso(new_first),
                "predicted_last_bag_time": iso(new_last),
                "staff_added_delay_minutes": total_delay,
            }})
            await db.carousel_assignments.update_one({"flight_id": flight_id}, {"$set": {
                "window_start": iso(new_first - timedelta(minutes=2)),
                "window_end": iso(new_last + timedelta(minutes=10)),
            }})

    await db.audit_log.insert_one({
        "id": str(uuid.uuid4()), "action": "flight_delay", "flight_id": flight_id,
        "flight_number": f.get("flight_number"), "by": user["email"],
        "minutes": body.additional_minutes, "total_delay": total_delay,
        "reason": body.reason, "at": iso(now())
    })

    await db.alerts.insert_one({
        "id": str(uuid.uuid4()), "alert_type": "flight_delay", "severity": "warning",
        "zone_id": f.get("gate") or "gate-dom",
        "title": f"Flight {f.get('flight_number')} Delayed +{body.additional_minutes}m",
        "message": f"{f.get('flight_number')} ({f.get('origin')} → {f.get('destination')}) delayed by {body.additional_minutes}m due to {body.reason}. Passenger timetables updated.",
        "triggered_at": iso(now()), "status": "open"
    })

    return {"ok": True, "flight_id": flight_id, "flight_number": f.get("flight_number"), "total_delay_minutes": total_delay, **upd}

@router.get("/admin/flights")
async def admin_list_flights(number: Optional[str] = None, direction: Optional[str] = None,
                             status: Optional[str] = None, date: Optional[str] = None,
                             limit: int = 250, user: dict = Depends(require_staff)):
    current_time = now()
    q = {}
    if number:
        q["$or"] = [
            {"flight_number": {"$regex": number.upper(), "$options": "i"}},
            {"endpoint": {"$regex": number, "$options": "i"}},
            {"origin": {"$regex": number, "$options": "i"}},
            {"destination": {"$regex": number, "$options": "i"}},
        ]
    if direction:
        q["direction"] = direction
    if status:
        q["status"] = status

    if date:
        await ensure_flights_for_date(date)
        date_q = [
            {"std": {"$regex": f"^{date}"}},
            {"sta": {"$regex": f"^{date}"}}
        ]
        if "$or" in q:
            q["$and"] = [{"$or": q.pop("$or")}, {"$or": date_q}]
        else:
            q["$or"] = date_q
    elif not number:
        await ensure_flights_for_date(current_time.strftime("%Y-%m-%d"))
        start_str = iso(current_time - timedelta(hours=4))
        end_str = iso(current_time + timedelta(hours=20))
        date_q = [
            {"std": {"$gte": start_str, "$lte": end_str}},
            {"sta": {"$gte": start_str, "$lte": end_str}}
        ]
        if "$or" in q:
            q["$and"] = [{"$or": q.pop("$or")}, {"$or": date_q}]
        else:
            q["$or"] = date_q

    flights = await db.flights.find(q, {"_id": 0}).to_list(1000)

    def sort_key(f):
        f_dt = parse_dt(f.get("std") or f.get("sta"))
        if not f_dt:
            return (2, 0)
        if f_dt >= current_time - timedelta(minutes=60):
            return (0, f_dt.timestamp())
        return (1, -f_dt.timestamp())

    flights.sort(key=sort_key)
    return {"flights": flights[:limit], "count": len(flights)}

@router.get("/baggage/assignments")
async def list_assignments(status: str | None = None, date: str | None = None):
    current_time = now()
    q = {}
    if status:
        q["status"] = status

    if date:
        await ensure_flights_for_date(date)
        q["$or"] = [
            {"window_start": {"$regex": f"^{date}"}},
            {"window_end": {"$regex": f"^{date}"}}
        ]
    else:
        await ensure_flights_for_date(current_time.strftime("%Y-%m-%d"))
        start_str = iso(current_time - timedelta(hours=4))
        end_str = iso(current_time + timedelta(hours=20))
        q["$or"] = [
            {"window_start": {"$gte": start_str, "$lte": end_str}},
            {"window_end": {"$gte": start_str, "$lte": end_str}}
        ]

    asg = await db.carousel_assignments.find(q, {"_id": 0}).to_list(1000)
    fids = [a["flight_id"] for a in asg]
    flights = {f["flight_id"]: f for f in await db.flights.find({"flight_id": {"$in": fids}}, {"_id": 0}).to_list(1000)}
    for a in asg:
        a["flight"] = flights.get(a["flight_id"])
        if not a.get("carousel_number") and not a.get("carousel_id"):
            a["carousel_number"] = "TBD"

    def asg_sort_key(a):
        a_dt = parse_dt(a.get("window_start"))
        if not a_dt:
            return (2, 0)
        if a_dt >= current_time - timedelta(minutes=60):
            return (0, a_dt.timestamp())
        return (1, -a_dt.timestamp())

    asg.sort(key=asg_sort_key)
    return {"assignments": asg}

class ReassignIn(BaseModel):
    carousel_id: str

@router.post("/baggage/assignments/{assignment_id}/reassign")
async def reassign(assignment_id: str, body: ReassignIn, user: dict = Depends(require_staff)):
    a = await db.carousel_assignments.find_one({"id": assignment_id})
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    c = await db.carousels.find_one({"carousel_id": body.carousel_id})
    if not c:
        raise HTTPException(status_code=404, detail="Carousel not found")

    current_version = a.get("version", 0)

    existing = await db.carousel_assignments.find_one({
        "carousel_id": body.carousel_id,
        "id": {"$ne": assignment_id},
        "window_start": {"$lt": a["window_end"]},
        "window_end": {"$gt": a["window_start"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Conflict: target carousel is already occupied during this time window.")

    result = await db.carousel_assignments.update_one(
        {"id": assignment_id, "version": current_version},
        {"$set": {
            "carousel_id": body.carousel_id, "carousel_number": c["carousel_number"], "status": "scheduled",
            "version": current_version + 1
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=409, detail="Record was modified by another user. Please refresh and try again.")

    await db.baggage_predictions.update_one({"flight_id": a["flight_id"]}, {"$set": {
        "carousel_id": body.carousel_id, "carousel_number": c["carousel_number"]}})
    return {"ok": True}

@router.get("/admin/carousels")
async def admin_carousels(user: dict = Depends(require_staff), target_time: Optional[str] = None, date: Optional[str] = None):
    target_date = date or (target_time[:10] if target_time else now().strftime("%Y-%m-%d"))
    await ensure_flights_for_date(target_date)

    cs = await db.carousels.find({}, {"_id": 0}).to_list(100)

    asg_query = {
        "$or": [
            {"window_start": {"$regex": f"^{target_date}"}},
            {"window_end": {"$regex": f"^{target_date}"}}
        ]
    }
    assignments = await db.carousel_assignments.find(asg_query, {"_id": 0}).to_list(1500)

    if target_time:
        current_time = parse_dt(target_time) or now()
    elif date:
        current_time = parse_dt(f"{date}T12:00:00Z") or now()
    else:
        current_time = now()

    sorted_active = sorted([c for c in cs if c.get("status") != "maintenance"], key=lambda c: c.get("carousel_number", ""))
    emergency_nums = set()
    ac13_14 = [c["carousel_number"] for c in sorted_active if c.get("carousel_number") in ("AC-13", "AC-14")]
    if len(ac13_14) >= 2:
        emergency_nums = set(ac13_14[:2])
    elif len(sorted_active) > 2:
        emergency_nums = {c["carousel_number"] for c in sorted_active[-2:]}

    asg_by_cid = {}
    for a in assignments:
        cid = a.get("carousel_id")
        if not cid:
            continue
        ws = parse_dt(a.get("window_start"))
        we = parse_dt(a.get("window_end"))
        if not ws or not we:
            continue
        if cid not in asg_by_cid:
            asg_by_cid[cid] = []
        asg_by_cid[cid].append((ws, we, a))

    for c in cs:
        cnum = c.get("carousel_number")
        is_reserve = cnum in emergency_nums
        c["is_emergency_reserve"] = is_reserve

        if c.get("status") == "maintenance":
            c["status"] = "maintenance"
            continue

        c_asgs = asg_by_cid.get(c["carousel_id"], [])
        status = "free"
        active_flight_info = None

        has_occupied = False
        has_scheduled = False

        for ws, we, a in c_asgs:

            if we < current_time:
                continue

            delta_t_min = (ws - current_time).total_seconds() / 60.0

            if delta_t_min <= 90 or (ws <= current_time <= we):
                has_occupied = True
                active_flight_info = {
                    "flight_id": a.get("flight_id"),
                    "window_start": a.get("window_start"),
                    "window_end": a.get("window_end"),
                    "status": "occupied"
                }
                break

            elif 90 < delta_t_min <= 180 and not has_scheduled:
                has_scheduled = True
                active_flight_info = {
                    "flight_id": a.get("flight_id"),
                    "window_start": a.get("window_start"),
                    "window_end": a.get("window_end"),
                    "status": "scheduled"
                }

        if has_occupied:
            status = "occupied"
        elif has_scheduled:
            status = "scheduled"
        else:
            status = "free"
            active_flight_info = None

        c["status"] = status
        c["active_flight"] = active_flight_info

    active_fids = [c["active_flight"]["flight_id"] for c in cs if c.get("active_flight") and c["active_flight"].get("flight_id")]
    if active_fids:
        flist = await db.flights.find({"flight_id": {"$in": active_fids}}, {"_id": 0, "flight_id": 1, "flight_number": 1, "origin": 1, "airline_name": 1}).to_list(100)
        fmap = {f["flight_id"]: f for f in flist}
        for c in cs:
            if c.get("active_flight") and c["active_flight"].get("flight_id") in fmap:
                fmatch = fmap[c["active_flight"]["flight_id"]]
                c["active_flight"]["flight_number"] = fmatch.get("flight_number")
                c["active_flight"]["origin"] = fmatch.get("origin")
                c["active_flight"]["airline_name"] = fmatch.get("airline_name")
                c["flight_number"] = fmatch.get("flight_number")

    cs.sort(key=lambda c: c["carousel_number"])
    return {"carousels": cs, "target_time": iso(current_time)}

class CarouselIn(BaseModel):
    carousel_number: str
    terminal: str = "T3"
    length_m: float = 90
    speed_mps: float = 0.5
    capacity: int = 1
    status: str = "free"

@router.post("/admin/carousels")
async def create_carousel(body: CarouselIn, user: dict = Depends(require_staff)):
    doc = {"carousel_id": str(uuid.uuid4()), **body.model_dump(), "updated_at": iso(now())}
    await db.carousels.insert_one(doc)
    return {"ok": True, "carousel_id": doc["carousel_id"]}

class CarouselPatch(BaseModel):
    status: str | None = None
    length_m: float | None = None
    speed_mps: float | None = None
    capacity: int | None = None

@router.patch("/admin/carousels/{carousel_id}")
async def patch_carousel(carousel_id: str, body: CarouselPatch, user: dict = Depends(require_staff)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    upd["updated_at"] = iso(now())
    r = await db.carousels.update_one({"carousel_id": carousel_id}, {"$set": upd})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Carousel not found")
    return {"ok": True}

@router.delete("/admin/carousels/{carousel_id}")
async def delete_carousel(carousel_id: str, user: dict = Depends(require_staff)):
    await db.carousels.delete_one({"carousel_id": carousel_id})
    return {"ok": True}

class BulkCarouselIn(BaseModel):
    carousels: list[CarouselIn]

@router.post("/admin/carousels/upload")
async def bulk_carousels(body: BulkCarouselIn, user: dict = Depends(require_staff)):
    docs = [{"carousel_id": str(uuid.uuid4()), **c.model_dump(), "updated_at": iso(now())} for c in body.carousels]
    if docs:
        await db.carousels.insert_many(docs)
    return {"ok": True, "inserted": len(docs)}

@router.post("/admin/recompute-baggage")
async def recompute(user: dict = Depends(require_staff)):
    from seed import recompute_baggage_and_carousels
    await recompute_baggage_and_carousels()
    return {"ok": True}

@router.get("/alerts")
async def list_alerts(status: str | None = None, severity: str | None = None, limit: int = 100,
                      user: dict = Depends(require_staff)):
    q = {}
    if status:
        q["status"] = status
    if severity:
        q["severity"] = severity
    alerts = await db.alerts.find(q, {"_id": 0}).sort("triggered_at", -1).to_list(limit)
    return {"alerts": alerts}

@router.post("/alerts/acknowledge-all")
async def ack_all_alerts(user: dict = Depends(require_staff)):
    r = await db.alerts.update_many({"status": "open"}, {"$set": {
        "status": "acknowledged", "acknowledged_by": user["email"], "acknowledged_at": iso(now())}})
    return {"acknowledged": r.modified_count}

@router.post("/alerts/{alert_id}/acknowledge")
async def ack_alert(alert_id: str, user: dict = Depends(require_staff)):
    name_str = user.get("name") or user.get("email")
    r = await db.alerts.update_one({"id": alert_id}, {"$set": {
        "status": "acknowledged", "acknowledged_by": user["email"], "acknowledged_name": name_str, "acknowledged_at": iso(now())}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"ok": True, "status": "acknowledged"}

@router.post("/alerts/{alert_id}/en-route")
async def en_route_alert(alert_id: str, user: dict = Depends(require_staff)):
    name_str = user.get("name") or user.get("email")
    r = await db.alerts.update_one({"id": alert_id}, {"$set": {
        "status": "en_route", "en_route_by": user["email"], "en_route_name": name_str, "en_route_at": iso(now())}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"ok": True, "status": "en_route"}

@router.post("/alerts/{alert_id}/on-station")
async def on_station_alert(alert_id: str, user: dict = Depends(require_staff)):
    name_str = user.get("name") or user.get("email")
    r = await db.alerts.update_one({"id": alert_id}, {"$set": {
        "status": "on_station", "on_station_by": user["email"], "on_station_name": name_str, "on_station_at": iso(now())}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"ok": True, "status": "on_station"}

@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str, user: dict = Depends(require_staff)):
    name_str = user.get("name") or user.get("email")
    r = await db.alerts.update_one({"id": alert_id}, {"$set": {
        "status": "resolved", "resolved_by": user["email"], "resolved_name": name_str, "resolved_at": iso(now())}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"ok": True, "status": "resolved"}

@router.get("/analytics/congestion")
async def analytics_congestion(zone_id: str | None = None, range: str = "24h"):
    hours = {"1h": 1, "24h": 24, "7d": 168, "30d": 720}.get(range, 24)
    since = iso(now() - timedelta(hours=hours))
    q = {"timestamp": {"$gte": since, "$lte": iso(now())}}
    if zone_id:
        q["zone_id"] = zone_id
    events = await db.congestion_events.find(q, {"_id": 0}).sort("timestamp", 1).to_list(5000)
    buckets = {}
    for e in events:
        key = (e["zone_id"], e["timestamp"][:13])
        b = buckets.setdefault(key, {"zone_id": e["zone_id"], "bucket": e["timestamp"][:13] + ":00",
                                     "count_sum": 0, "wait_sum": 0, "peak": 0, "n": 0})
        b["count_sum"] += e["person_count"]
        b["wait_sum"] += e["avg_wait_seconds"]
        b["peak"] = max(b["peak"], e["person_count"])
        b["n"] += 1
    series = [{"zone_id": b["zone_id"], "bucket": b["bucket"], "avg_count": round(b["count_sum"] / b["n"], 1),
               "avg_wait_min": round(b["wait_sum"] / b["n"] / 60, 1), "peak_count": round(b["peak"], 1)}
              for b in buckets.values()]
    series.sort(key=lambda x: x["bucket"])
    return {"range": range, "series": series}

@router.get("/analytics/congestion/heatmap")
async def analytics_heatmap(range: str = "7d"):
    hours = {"7d": 168, "30d": 720}.get(range, 168)
    since = iso(now() - timedelta(hours=hours))
    events = await db.congestion_events.find({"timestamp": {"$gte": since}}, {"_id": 0}).to_list(20000)
    grid = {}
    for e in events:
        dt = parse_dt(e["timestamp"])
        key = (dt.weekday(), dt.hour)
        g = grid.setdefault(key, {"dow": dt.weekday(), "hour": dt.hour, "sum": 0, "n": 0})
        g["sum"] += e["person_count"]
        g["n"] += 1
    cells = [{"dow": g["dow"], "hour": g["hour"], "avg_count": round(g["sum"] / g["n"], 1)} for g in grid.values()]
    return {"cells": cells}

@router.get("/analytics/baggage")
async def analytics_baggage(range: str = "24h", user: dict = Depends(require_staff)):
    carousels = await db.carousels.find({}, {"_id": 0}).to_list(100)
    asg = await db.carousel_assignments.find({}, {"_id": 0}).to_list(3000)
    util = {}
    for c in carousels:
        util[c["carousel_id"]] = {
            "carousel_id": c["carousel_id"],
            "carousel_number": c["carousel_number"],
            "assignments": 0,
            "status": c["status"]
        }
    for a in asg:
        cid = a.get("carousel_id")
        if cid in util:
            util[cid]["assignments"] += 1

    max_asg = max([u["assignments"] for u in util.values()] + [1])
    for u in util.values():
        if u["status"] == "maintenance":
            u["utilization_pct"] = 0.0
        else:

            target_cap = max(max_asg * 1.15, 8)
            u["utilization_pct"] = min(96.0, round((u["assignments"] / target_cap) * 100, 1))

    bag_stats = await _bag_stats()
    return {"carousel_utilization": sorted(util.values(), key=lambda x: x["carousel_number"]),
            "bag_stats": bag_stats, "conflicts": sum(1 for a in asg if a.get("status") == "conflict")}

@router.get("/analytics/alerts")
async def analytics_alerts(range: str = "7d", user: dict = Depends(require_staff)):
    hours = {"24h": 24, "7d": 168, "30d": 720}.get(range, 168)
    since = iso(now() - timedelta(hours=hours))
    alerts = await db.alerts.find({"triggered_at": {"$gte": since}}, {"_id": 0}).to_list(5000)
    by_type, by_sev, by_day = {}, {}, {}
    ack_times = []
    for a in alerts:
        by_type[a["alert_type"]] = by_type.get(a["alert_type"], 0) + 1
        by_sev[a["severity"]] = by_sev.get(a["severity"], 0) + 1
        day = a["triggered_at"][:10]
        d = by_day.setdefault(day, {"day": day, "info": 0, "warning": 0, "critical": 0})
        d[a["severity"]] = d.get(a["severity"], 0) + 1
        if a.get("acknowledged_at"):
            ack_times.append((parse_dt(a["acknowledged_at"]) - parse_dt(a["triggered_at"])).total_seconds())
    return {"by_type": by_type, "by_severity": by_sev,
            "by_day": sorted(by_day.values(), key=lambda x: x["day"]),
            "avg_ack_seconds": round(sum(ack_times) / len(ack_times), 1) if ack_times else None,
            "open": sum(1 for a in alerts if a["status"] == "open")}

@router.get("/analytics/impact-timeline")
async def analytics_impact_timeline():
    zones = await db.zones.find({}, {"_id": 0}).to_list(100)
    flights = await db.flights.find({}, {"_id": 0}).to_list(3000)
    base = now().replace(minute=0, second=0, microsecond=0)
    out = []
    for h in range(24):
        t = base.replace(hour=h)
        wn = wo = saved = 0.0
        for z in zones:
            cur_pred = engines.predict_zone(z, flights, t, 2.0, t)
            opt_z = dict(z)
            opt_z["counters_open"] = cur_pred["recommended_counters"]
            opt_pred = engines.predict_zone(opt_z, flights, t, 2.0, t)
            cw = cur_pred["predicted_wait_seconds"] / 60.0
            ow = min(opt_pred["predicted_wait_seconds"] / 60.0, cw)
            wn += cw; wo += ow; saved += max(0.0, cw - ow) * cur_pred["predicted_count"]
        out.append({"hour": h, "avg_wait_now": round(wn / len(zones), 1),
                    "avg_wait_opt": round(wo / len(zones), 1), "pax_min_saved": round(saved)})
    peak = max(out, key=lambda x: x["pax_min_saved"]) if out else None
    return {"timeline": out, "peak_hour": peak["hour"] if peak else 0}

@router.get("/analytics/impact")
async def analytics_impact():
    zones = await db.zones.find({}, {"_id": 0}).to_list(100)
    flights = await db.flights.find({}, {"_id": 0}).to_list(2000)
    rows = []
    total_saved = 0.0
    for z in zones:
        cur_pred = engines.predict_zone(z, flights, now(), 2.0, now())
        opt_z = dict(z)
        opt_z["counters_open"] = cur_pred["recommended_counters"]
        opt_pred = engines.predict_zone(opt_z, flights, now(), 2.0, now())
        cw = cur_pred["predicted_wait_seconds"] / 60.0
        ow = min(opt_pred["predicted_wait_seconds"] / 60.0, cw)
        pax = cur_pred["predicted_count"]
        saved = max(0.0, cw - ow)
        total_saved += saved * pax
        rows.append({"zone_id": z["zone_id"], "name": z["name"], "crowd_level": cur_pred["crowd_level"],
                     "counters_open": z["counters_open"], "recommended_counters": cur_pred["recommended_counters"],
                     "wait_now_min": round(cw, 1), "wait_optimized_min": round(ow, 1),
                     "predicted_pax": round(pax), "minutes_saved_per_pax": round(saved, 1)})
    rows.sort(key=lambda r: r["minutes_saved_per_pax"], reverse=True)
    return {"rows": rows, "total_pax_minutes_saved": round(total_saved),
            "zones_understaffed": sum(1 for r in rows if r["recommended_counters"] > r["counters_open"])}

@router.get("/config/holidays")
async def get_holidays():
    doc = await db.config.find_one({"_id": "holidays"})
    return {"holidays": doc["value"] if doc else []}

@router.get("/config/staffing")
async def get_staffing():
    doc = await db.config.find_one({"_id": "staffing"})
    return {"staffing": doc["value"] if doc else []}

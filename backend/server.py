import os
import asyncio
import uuid
import logging
from pathlib import Path
from datetime import timedelta
from collections import defaultdict

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from starlette.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import db, now, iso, parse_dt
import engines
import email_service
import sms_service
import whatsapp_service
from auth import router as auth_router, seed_admin, create_indexes
from api import router as api_router, SLA_FIRST_BAG

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aeroflow")

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="AeroFlow AI — Airport Operations")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth_router)
app.include_router(api_router)

BOT_USER_AGENTS = {
    "bot", "crawl", "spider", "slurp", "curl", "wget", "python-requests", "http", "scan", "test"
}

@app.middleware("http")
async def bot_protection_middleware(request: Request, call_next):
    if request.method == "OPTIONS" or request.url.path == "/health":
        return await call_next(request)
    user_agent = request.headers.get("user-agent", "").lower()
    if any(bot in user_agent for bot in ["sqlmap", "nikto", "masscan"]):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"detail": "Access denied"})
    return await call_next(request)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": iso(now())}

frontend_url = os.environ.get("FRONTEND_URL", "https://aeroflow-hub.vercel.app")
origins = list({
    frontend_url,
    "https://aeroflow-hub.vercel.app",
    "https://aero-flow.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
})
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_sim_task = None

class WSManager:
    def __init__(self):
        self.active = set()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.add(ws)

    def disconnect(self, ws: WebSocket):
        self.active.discard(ws)

    async def broadcast(self, msg: dict):
        dead = []
        for ws in list(self.active):
            try:
                await ws.send_json(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

manager = WSManager()

@app.websocket("/api/ws/live")
async def ws_live(ws: WebSocket):
    await manager.connect(ws)
    try:
        await ws.send_json({"type": "connected", "ts": iso(now())})
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:
        manager.disconnect(ws)

async def _make_alert(alert_type, severity, message, zone_id=None, flight_id=None, carousel_id=None):
    existing = await db.alerts.find_one({"alert_type": alert_type, "zone_id": zone_id, "flight_id": flight_id,
                                         "status": {"$in": ["open", "acknowledged"]}})
    if existing:
        return
    cutoff = iso(now() - timedelta(minutes=30))
    recent = await db.alerts.find_one({"alert_type": alert_type, "zone_id": zone_id, "flight_id": flight_id,
                                       "status": "resolved", "resolved_at": {"$gte": cutoff}})
    if recent:
        return
    doc = {"id": str(uuid.uuid4()), "alert_type": alert_type, "severity": severity, "message": message,
           "zone_id": zone_id, "flight_id": flight_id, "carousel_id": carousel_id,
           "triggered_at": iso(now()), "status": "open", "acknowledged_by": None,
           "acknowledged_at": None, "resolved_at": None}
    await db.alerts.insert_one(doc)
    if severity == "critical":
        admin_email = os.environ.get("ADMIN_EMAIL")
        if admin_email:
            asyncio.create_task(email_service.send_alert_email(admin_email, severity, message))

async def run_alert_rules(zone_states, flights):
    for z in zone_states:
        if z["crowd_level"] == "heavy":
            await _make_alert("congestion", "critical",
                              f"Heavy congestion at {z['name']}: ~{int(z['predicted_count'])} pax, wait ~{round(z['predicted_wait_seconds']/60)} min.",
                              zone_id=z["zone_id"])
        if z["recommended_counters"] > z["counters_open"] + 2:
            await _make_alert("understaffing", "warning",
                              f"{z['name']} understaffed: {z['counters_open']} open, {z['recommended_counters']} recommended.",
                              zone_id=z["zone_id"])
    for f in flights:
        if f["direction"] == "departure":
            std = parse_dt(f.get("std")); etd = parse_dt(f.get("etd"))
            if std and etd and (etd - std).total_seconds() > 20 * 60 and 0 <= (std - now()).total_seconds() <= 2 * 3600:
                await _make_alert("flight_delay", "warning",
                                  f"{f['flight_number']} delayed {round((etd-std).total_seconds()/60)} min — arrival load shifting.",
                                  flight_id=f["flight_id"])
    bag_preds = await db.baggage_predictions.find({}, {"_id": 0}).to_list(1000)
    fmap = {f["flight_id"]: f for f in flights}
    carousels = {c["carousel_id"]: c for c in await db.carousels.find({}, {"_id": 0}).to_list(100)}
    curve = await db.retrieval_curve.find({}, {"_id": 0}).to_list(100)
    for b in bag_preds:
        f = fmap.get(b["flight_id"])
        if not f:
            continue
        ata = parse_dt(f.get("ata") or f.get("sta"))
        first = parse_dt(b["predicted_first_bag_time"])
        if ata and first:
            sla = SLA_FIRST_BAG["INT" if f["is_international"] else "DOM"]
            if (first - ata).total_seconds() / 60 > sla:
                await _make_alert("baggage_delay", "warning",
                                  f"{f['flight_number']} first bag ~{round((first-ata).total_seconds()/60)} min (SLA {sla} min).",
                                  flight_id=f["flight_id"], carousel_id=b.get("carousel_id"))
        c = carousels.get(b.get("carousel_id"))
        if c and first:
            mins = (now() - first).total_seconds() / 60
            if 0 <= mins <= 30:
                pct = engines.pct_retrieved_at(curve, mins)
                onbelt = engines.bags_on_belt(f, pct)
                if onbelt > engines.belt_capacity(c):
                    await _make_alert("carousel_overcrowd", "critical",
                                      f"Carousel {c['carousel_number']} overcrowded: ~{int(onbelt)} bags vs capacity {engines.belt_capacity(c)}.",
                                      carousel_id=c["carousel_id"], flight_id=f["flight_id"])

async def send_baggage_notifications(flights):
    bag_preds = await db.baggage_predictions.find({}, {"_id": 0}).to_list(1000)
    fmap = {f["flight_id"]: f for f in flights}

    for b in bag_preds:
        f = fmap.get(b["flight_id"])
        if not f or f["direction"] != "arrival":
            continue

        first_bag_time = parse_dt(b.get("predicted_first_bag_time"))
        if not first_bag_time:
            continue

        time_since_start = (now() - first_bag_time).total_seconds()
        if not (0 <= time_since_start <= 60):
            continue

        already_sent = await db.baggage_notifications_sent.find_one({
            "flight_id": b["flight_id"],
            "sent_at": {"$gte": iso(now() - timedelta(hours=1))}
        })
        if already_sent:
            continue

        saved_flights = await db.saved_flights.find({"flight_id": b["flight_id"]}).to_list(100)
        if not saved_flights:
            continue

        user_ids = [sf["user_id"] for sf in saved_flights]
        users = await db.users.find({
            "_id": {"$in": user_ids},
            "notify_baggage_belt": True
        }).to_list(100)

        for user in users:
            try:
                await email_service.send_baggage_belt_email(
                    user["email"],
                    f["flight_number"],
                    b.get("carousel_number", "TBD"),
                    b.get("bag_count", "—")
                )
                logger.info("Baggage belt email sent to %s for flight %s", user["email"], f["flight_number"])
            except Exception as e:
                logger.error("Failed to send baggage email to %s: %s", user["email"], e)

            if user.get("notify_sms") and user.get("phone"):
                try:
                    await sms_service.send_baggage_belt_sms(
                        user["phone"],
                        f["flight_number"],
                        b.get("carousel_number", "TBD"),
                        b.get("bag_count", "—")
                    )
                    logger.info("Baggage belt SMS sent to %s for flight %s", user["phone"], f["flight_number"])
                except Exception as e:
                    logger.error("Failed to send baggage SMS to %s: %s", user["phone"], e)

            if user.get("notify_whatsapp") and user.get("phone"):
                try:
                    await whatsapp_service.send_baggage_belt_whatsapp(
                        user["phone"],
                        f["flight_number"],
                        b.get("carousel_number", "TBD"),
                        b.get("bag_count", "—")
                    )
                    logger.info("Baggage belt WhatsApp sent to %s for flight %s", user["phone"], f["flight_number"])
                except Exception as e:
                    logger.error("Failed to send baggage WhatsApp to %s: %s", user["phone"], e)

        await db.baggage_notifications_sent.insert_one({
            "flight_id": b["flight_id"],
            "sent_at": iso(now())
        })

async def simulation_tick():
    zones = await db.zones.find({}, {"_id": 0}).to_list(100)
    flights = await db.flights.find({}, {"_id": 0}).to_list(2000)
    states = []
    events = []
    t = now()
    for z in zones:
        pred = engines.predict_zone(z, flights, t, 2.0, t)
        states.append({**z, **pred})
        events.append({"id": str(uuid.uuid4()), "zone_id": z["zone_id"], "timestamp": iso(t),
                       "person_count": pred["predicted_count"], "avg_wait_seconds": pred["predicted_wait_seconds"],
                       "counters_open": z["counters_open"], "source": pred["mode"]})
    if events:
        await db.congestion_events.insert_many(events)
    await run_alert_rules(states, flights)
    await send_baggage_notifications(flights)
    heavy_zones = {z["zone_id"] for z in states if z["crowd_level"] == "heavy"}
    open_cong = await db.alerts.find({"alert_type": "congestion", "status": {"$in": ["open", "acknowledged"]}},
                                     {"_id": 0}).to_list(100)
    for a in open_cong:
        if a["zone_id"] not in heavy_zones:
            await db.alerts.update_one({"id": a["id"]}, {"$set": {"status": "resolved", "resolved_at": iso(now())}})

async def backfill_history():
    import random
    marker = await db.config.find_one({"_id": "history_v"})
    if marker and marker.get("value") == 4 and await db.congestion_events.count_documents({}) > 100:
        return
    await db.congestion_events.delete_many({"source": "schedule_derived"})
    zones = await db.zones.find({}, {"_id": 0}).to_list(100)
    flights = await db.flights.find({}, {"_id": 0}).to_list(3000)
    today = now()
    events = []
    for d in range(8, -1, -1):
        day_dt = today - timedelta(days=d)
        day_factor = 1.15 if day_dt.weekday() >= 5 else 1.0
        for h in range(24):
            t_today = today.replace(hour=h, minute=0, second=0, microsecond=0)
            stamp = day_dt.replace(hour=h, minute=0, second=0, microsecond=0)
            for z in zones:
                pred = engines.predict_zone(z, flights, t_today, 2.0, t_today)
                noise = 0.90 + random.random() * 0.2
                events.append({"id": str(uuid.uuid4()), "zone_id": z["zone_id"], "timestamp": iso(stamp),
                               "person_count": round(pred["predicted_count"] * day_factor * noise, 1),
                               "avg_wait_seconds": round(pred["predicted_wait_seconds"] * day_factor * noise, 1),
                               "counters_open": z["counters_open"], "source": "schedule_derived"})
    if events:
        await db.congestion_events.insert_many(events)
    await db.config.update_one({"_id": "history_v"}, {"$set": {"value": 4}}, upsert=True)
    logger.info("Backfilled %d history events", len(events))

async def sim_loop():
    last_seed_day = now().date()
    while True:
        try:
            current_day = now().date()
            if current_day != last_seed_day:
                from seed import seed_flights_for_today
                logger.info("Day rolled over to %s, refreshing rolling schedule", current_day)
                await seed_flights_for_today(force=True)
                last_seed_day = current_day

            await simulation_tick()
            await manager.broadcast({"type": "tick", "ts": iso(now())})
        except Exception as e:
            logger.exception("sim tick error: %s", e)
        await asyncio.sleep(15)

@app.on_event("startup")
async def startup():
    from seed import seed_all
    await create_indexes()
    await seed_admin()
    await seed_all()
    bmarker = await db.config.find_one({"_id": "baggage_v"})
    if not (bmarker and bmarker.get("value") == 5):
        await db.config.update_one({"_id": "baggage_v"}, {"$set": {"value": 5}}, upsert=True)
    await db.congestion_events.create_index("timestamp")
    await db.congestion_events.create_index("zone_id")
    await backfill_history()
    await write_test_credentials()
    global _sim_task
    _sim_task = asyncio.create_task(sim_loop())
    logger.info("AeroFlow started. Origins=%s", origins)

async def write_test_credentials():
    codes = await db.staff_invite_codes.find({}, {"_id": 0}).to_list(50)
    lines = [
        "# Test Credentials — AeroFlow AI",
        "",
        "## Admin (pre-seeded, verified)",
        f"- Email: {os.environ.get('ADMIN_EMAIL')}",
        f"- Password: {os.environ.get('ADMIN_PASSWORD')}",
        "- Role: admin",
        "",
        "## Auth flow",
        "- Passenger signup: POST /api/auth/register (no invite_code) -> POST /api/auth/otp/verify (OTP emailed, not returned in API)",
        "- Staff signup: POST /api/auth/register WITH invite_code -> verify OTP",
        "- Login: POST /api/auth/login (email+password). Forgot/reset: /api/auth/forgot-password, /api/auth/reset-password",
        "",
        "## Staff invite codes (pre-provisioned)",
    ]
    for c in codes:
        used = "USED" if c.get("used_by") else "available"
        lines.append(f"- {c['code']} -> {c['role']} ({used})")
    try:
        memory_dir = Path(__file__).parent.parent / "memory"
        memory_dir.mkdir(exist_ok=True)
        Path(memory_dir / "test_credentials.md").write_text("\n".join(lines) + "\n")
    except Exception:
        try:
            local_memory = Path(__file__).parent / "memory"
            local_memory.mkdir(exist_ok=True)
            Path(local_memory / "test_credentials.md").write_text("\n".join(lines) + "\n")
        except Exception as e:
            logger.warning(f"Could not write test credentials file: {e}")

@app.on_event("shutdown")
async def shutdown():
    global _sim_task
    if _sim_task:
        _sim_task.cancel()

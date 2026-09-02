import math
from datetime import timedelta, datetime
from database import parse_dt
import baggage_model
import maps_service

SQRT2PI = math.sqrt(2 * math.pi)

LEAD_MIN = {"domestic": 120, "international": 190}
ARRIVAL_SD = 15.0
ZONE_OFFSET_MIN = {"checkin": 6, "security": 22, "immigration": 36, "gate": 48}
WALK_SPEED_MPS = 1.2
CHECKED_BAG_RATIO = 0.72
BAG_SPACING_M = 1.6

def norm_pdf(x, mu, sd):
    z = (x - mu) / sd
    return math.exp(-0.5 * z * z) / (sd * SQRT2PI)

def erlang_metrics(lam, mu, c):
    if lam <= 0 or mu <= 0:
        return {"wait_seconds": 0.0, "lq": 0.0, "count": 0.0, "util": 0.0, "c": max(1, int(c))}
    a = lam / mu
    c = max(1, int(c))
    rho = a / c
    B = 1.0
    for k in range(1, c + 1):
        B = (a * B) / (k + a * B)
    if rho >= 1:
        wq = 1200.0
        lq = lam * wq
    else:
        C = B / (1 - rho * (1 - B))
        denom = c * mu - lam
        wq = C / denom if denom > 0 else 1200.0
        lq = lam * wq
    count = lq + a
    wait_seconds = wq
    return {"wait_seconds": wait_seconds, "lq": lq, "count": count, "util": min(rho, 1.0), "c": c}

def flight_matches_zone(flight, zone):
    zt = zone["zone_type"]
    intl = flight.get("is_international")
    direction = flight.get("direction")
    zid = zone["zone_id"]

    if zid == "immigration-arr":
        return direction == "arrival" and intl
    if direction != "departure":
        return False
    if zt == "checkin":
        if bool(intl) != bool(zone.get("serves_international")):
            return False

        if not intl:
            al = flight.get("airline_code") or flight.get("flight_number", "")[:2]
            if zid == "checkin-dom-a":
                return al in ("AI", "UK", "QP", "SG")
            else:
                return al not in ("AI", "UK", "QP", "SG")
        return True
    if zt in ("security", "gate"):
        return bool(intl) == bool(zone.get("serves_international"))
    if zt == "immigration":
        return bool(intl)
    return False

def zone_arrival_rate_per_min(zone, flights, t):
    total = 0.0
    zt = zone["zone_type"]
    offset = ZONE_OFFSET_MIN.get(zt, 10)

    for f in flights:
        if not flight_matches_zone(f, zone):
            continue
        pax = f.get("passengers", 200)
        if zone["zone_id"] == "immigration-arr":
            ata = parse_dt(f.get("ata") or f.get("sta"))
            if not ata:
                continue
            center = ata + timedelta(minutes=10)
            x = (t - center).total_seconds() / 60.0
            total += pax * norm_pdf(x, 0, 22.0)
        else:
            std = parse_dt(f.get("etd") or f.get("std"))
            if not std:
                continue
            lead = LEAD_MIN["international"] if f.get("is_international") else LEAD_MIN["domestic"]
            entrance_center = std - timedelta(minutes=lead)
            entrance_x_min = (t - timedelta(minutes=offset) - entrance_center).total_seconds() / 60.0
            total += pax * norm_pdf(entrance_x_min, 0, 28.0)

    baseline = 6.0 if zone.get("serves_international") else 8.0
    return total + baseline

def crowd_level(count, zone):
    nm = zone.get("threshold_normal_max", 180)
    mm = zone.get("threshold_medium_max", 380)
    if count <= nm:
        return "normal"
    if count <= mm:
        return "medium"
    return "heavy"

def recommend_counters(lam_min, svc, zone):
    cap = int(zone.get("capacity", zone.get("counters_open", 1)))
    mu_min = 60.0 / max(svc, 10.0)
    needed = math.ceil(lam_min / (mu_min * 0.65))
    return max(1, min(cap, max(2, needed)))

def predict_zone(zone, flights, t, cutoff_hours=2.0, now=None):
    lam_min = zone_arrival_rate_per_min(zone, flights, t)

    lam_min *= 6.0

    svc = float(zone.get("avg_service_seconds_per_passenger", 60))
    c = max(1, int(zone.get("counters_open", 1)))
    cap = max(1, int(zone.get("capacity", 60)))
    nm = zone.get("threshold_normal_max", 180)
    mm = zone.get("threshold_medium_max", 380)

    rec = recommend_counters(lam_min, svc, zone)

    staffed_at = zone.get("staffed_at")
    if staffed_at:
        import dateutil.parser
        from datetime import timezone
        try:
            dt = dateutil.parser.isoparse(staffed_at)

            if (now.replace(tzinfo=timezone.utc) if now else datetime.now(timezone.utc)) > dt + timedelta(hours=1):
                c = zone.get("original_counters", rec)
        except Exception:
            pass

    mu_min = 60.0 / max(svc, 10.0)
    cap_min = c * mu_min
    load_ratio = lam_min / max(0.1, cap_min)

    staffing_ratio = c / max(1, rec)

    zt = zone.get("zone_type", "")
    transit_mins = 6.0 if zt == "security" else 8.0 if zt == "checkin" else 10.0 if zt == "gate" else 7.0
    transit_pax = max(15.0, lam_min * transit_mins)

    in_service = min(float(c), lam_min / mu_min)

    if staffing_ratio >= 1.0:

        in_queue = max(4.0, (load_ratio ** 1.5) * 15.0)
        wait_seconds = max(45.0, (in_queue / max(0.1, cap_min)) * 60.0 + (svc * 0.4))
        lvl = "normal"
    elif staffing_ratio >= 0.70:

        gap = (1.0 - staffing_ratio) / 0.30
        in_queue = 30.0 + gap * 80.0
        wait_seconds = 180.0 + gap * 180.0
        lvl = "medium"
    else:

        deficit = (0.70 - staffing_ratio) / 0.70
        in_queue = 150.0 + deficit * 350.0
        wait_seconds = min(1500.0, 450.0 + deficit * 600.0)
        lvl = "heavy"

    count = round(transit_pax + in_service + in_queue, 1)
    wait_seconds = round(min(1500.0, max(45.0, wait_seconds)), 1)

    mode = "predictive"
    if now is not None:
        for f in flights:
            if not flight_matches_zone(f, zone):
                continue
            ref = parse_dt(f.get("etd") or f.get("std") or f.get("ata") or f.get("sta"))
            if ref and abs((ref - now).total_seconds()) <= cutoff_hours * 3600:
                mode = "realtime"
                break

    return {
        "zone_id": zone["zone_id"],
        "predicted_count": count,
        "predicted_wait_seconds": wait_seconds,
        "base_process_min": base_process_min(zone),
        "crowd_level": lvl,
        "counters_open": c,
        "recommended_counters": rec,
        "utilization": round(min(1.0, load_ratio), 3),
        "mode": mode,
        "confidence": 0.9 if mode == "realtime" else 0.75,
        "arrival_rate_per_min": round(lam_min, 1),
    }

UNLOAD_RATE_BAGS_PER_MIN = 9.0

def base_process_min(zone):
    zt = zone["zone_type"]
    intl = zone.get("serves_international")
    if zt == "checkin":
        return 20 if intl else 11
    if zt == "security":
        return 20 if intl else 14
    if zt == "immigration":
        return 28
    if zt == "gate":
        return 4
    return 5

def predict_baggage(flight, bag_stats=None):
    onblock = parse_dt(flight.get("ata") or flight.get("sta"))
    if not onblock:
        return None
    hour = onblock.hour
    d = baggage_model.predict_durations(
        flight.get("passengers", 150), flight.get("luggage_kg", 3000),
        flight.get("is_international"), hour, flight.get("ground_handler"))
    delay = flight.get("staff_added_delay_minutes", 0) or 0
    first_off = d["first_min"]
    bags = flight.get("passengers", 150) * CHECKED_BAG_RATIO
    unload_dur = bags / UNLOAD_RATE_BAGS_PER_MIN
    last_off = max(d["last_min"], first_off + max(6.0, unload_dur))
    last_off = min(last_off, first_off + 42)
    first = onblock + timedelta(minutes=first_off + delay)
    last = onblock + timedelta(minutes=last_off + delay)
    return {
        "onblock": onblock,
        "predicted_first_bag_time": first,
        "predicted_last_bag_time": last,
        "staff_added_delay_minutes": delay,
        "bag_count": round(bags),
        "confidence": 0.88 if d["source"] == "gbr" else 0.7,
    }

def belt_capacity(carousel):
    return max(10, int(carousel.get("length_m", 90) / BAG_SPACING_M))

def bags_on_belt(flight, pct_retrieved):
    bags = flight.get("passengers", 0) * CHECKED_BAG_RATIO
    return bags * (1 - pct_retrieved / 100.0)

def pct_retrieved_at(curve, minutes_since_first):
    if minutes_since_first <= 0:
        return 0.0
    pts = sorted(curve, key=lambda x: x["minute_mark"])
    if minutes_since_first >= pts[-1]["minute_mark"]:
        return 100.0
    prev = {"minute_mark": 0, "pct_retrieved": 0.0}
    for p in pts:
        if minutes_since_first <= p["minute_mark"]:
            span = p["minute_mark"] - prev["minute_mark"]
            frac = (minutes_since_first - prev["minute_mark"]) / span if span else 0
            return prev["pct_retrieved"] + frac * (p["pct_retrieved"] - prev["pct_retrieved"])
        prev = p
    return 100.0

def allocate_carousels(arrivals, carousels, buffer_min=10, now_dt=None):
    from database import now as db_now

    current_time = now_dt or db_now()

    active_carousels = [c for c in carousels if c.get("status") != "maintenance"]

    sorted_carousels = sorted(active_carousels, key=lambda c: c.get("carousel_number", ""))

    emergency_cids = set()
    ac13_14 = [c["carousel_id"] for c in sorted_carousels if c.get("carousel_number") in ("AC-13", "AC-14")]
    if len(ac13_14) >= 2:
        emergency_cids = set(ac13_14[:2])
    elif len(sorted_carousels) > 2:
        emergency_cids = {c["carousel_id"] for c in sorted_carousels[-2:]}

    allocatable = [c for c in sorted_carousels if c["carousel_id"] not in emergency_cids]
    if not allocatable and sorted_carousels:
        allocatable = sorted_carousels

    c_free_time = {c["carousel_id"]: 0.0 for c in allocatable}
    c_asg_count = {c["carousel_id"]: 0 for c in allocatable}

    assignments = []

    sorted_arrivals = sorted(arrivals, key=lambda x: parse_dt(x.get("window_start")) or current_time)

    for a in sorted_arrivals:
        ws_dt = parse_dt(a.get("window_start"))
        we_dt = parse_dt(a.get("window_end"))
        if not ws_dt or not we_dt:
            assignments.append({**a, "carousel_id": None, "carousel_number": "TBD", "status": "yet_to_assign"})
            continue

        ws = ws_dt.timestamp()
        we = (we_dt + timedelta(minutes=buffer_min)).timestamp()
        delta_t_min = (ws_dt - current_time).total_seconds() / 60.0
        delta_end_min = (we_dt - current_time).total_seconds() / 60.0

        if delta_t_min > 180:
            assignments.append({
                **a,
                "carousel_id": None,
                "carousel_number": "TBD",
                "status": "yet_to_assign"
            })
            continue

        if delta_end_min < 0:
            st = "completed"
        elif delta_t_min <= 90 or (ws_dt <= current_time <= we_dt):
            st = "occupied"
        else:
            st = "scheduled"

        available = [cid for cid, ft in c_free_time.items() if ft <= ws]
        if available:

            best_cid = min(available, key=lambda cid: (c_asg_count[cid], cid))
            c_free_time[best_cid] = we
            c_asg_count[best_cid] += 1
            assignments.append({**a, "carousel_id": best_cid, "status": st})
        else:

            earliest_cid = min(c_free_time.keys(), key=lambda cid: c_free_time[cid])
            c_free_time[earliest_cid] = we
            c_asg_count[earliest_cid] += 1
            assignments.append({**a, "carousel_id": earliest_cid, "status": st})

    return assignments

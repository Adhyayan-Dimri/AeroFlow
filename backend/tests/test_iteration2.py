import json
import os
import statistics

import pytest
import requests
import websockets
from dotenv import dotenv_values

from otp_helper import test_otp

frontend_env = dotenv_values("../frontend/.env") if os.path.exists("../frontend/.env") else {}
BASE = (os.environ.get("REACT_APP_BACKEND_URL")
        or frontend_env.get("REACT_APP_BACKEND_URL") or "http://127.0.0.1:8000").rstrip("/")
API = f"{BASE}/api"
ADMIN = {"email": "adhyayan02@icloud.com", "password": "AeroFlow@2026"}

@pytest.fixture(scope="module")
def staff():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=ADMIN, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"admin login failed {r.status_code}: {r.text[:300]}")
    return s

class TestAuthRegression:
    def test_admin_login_and_me(self, staff):
        r = staff.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["email"] == ADMIN["email"] and u["role"] == "admin"

    def test_passenger_register_verify_rbac(self):
        import uuid
        s = requests.Session()
        email = f"TEST_it2_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/register",
                   json={"email": email, "password": "Passw0rd!23", "name": "TEST It2"}, timeout=30)
        assert r.status_code in (200, 201), r.text[:300]
        otp = test_otp(r.json())
        v = s.post(f"{API}/auth/otp/verify", json={"email": email, "otp": otp}, timeout=30)
        assert v.status_code == 200, v.text[:300]
        me = s.get(f"{API}/auth/me", timeout=30)
        assert me.status_code == 200 and me.json()["user"]["role"] == "passenger"
        assert s.get(f"{API}/alerts", timeout=30).status_code == 403

class TestBaggageVariance:
    @pytest.fixture(scope="class")
    def assignments(self, staff):
        r = requests.get(f"{API}/baggage/assignments", timeout=90)
        assert r.status_code == 200, r.text[:300]
        a = r.json()["assignments"]
        assert len(a) >= 5, len(a)
        out = []
        for x in a[:20]:
            pr = staff.get(f"{API}/baggage/flights/{x['flight_id']}/prediction", timeout=30)
            if pr.status_code == 200:
                d = pr.json()
                x = dict(x, prediction={"first_bag_time": d["predicted_first_bag_time"],
                                        "last_bag_time": d["predicted_last_bag_time"],
                                        "bag_count": d.get("bag_count")})
            out.append(x)
        return out

    def test_window_not_constant(self, assignments):
        import datetime as dt

        def mins(a):
            f = dt.datetime.fromisoformat(a["prediction"]["first_bag_time"].replace("Z", "+00:00"))
            l = dt.datetime.fromisoformat(a["prediction"]["last_bag_time"].replace("Z", "+00:00"))
            return (l - f).total_seconds() / 60

        windows = [mins(a) for a in assignments if a.get("prediction")]
        assert len(windows) >= 5, "not enough predictions"
        uniq = set(round(w, 1) for w in windows)
        print("windows sample:", sorted(uniq)[:15], "n=", len(windows))
        assert len(uniq) > 1, f"first->last bag window is constant at {uniq}"
        assert statistics.pstdev(windows) > 0.5, f"window variance too low: {sorted(uniq)}"
        assert all(w > 0 for w in windows)

    def test_higher_pax_longer_window(self, assignments):
        import datetime as dt
        pts = []
        for a in assignments:
            p = a.get("prediction") or {}
            pax = (a.get("flight") or {}).get("passengers") or p.get("bag_count")
            if not (p.get("first_bag_time") and pax):
                continue
            f = dt.datetime.fromisoformat(p["first_bag_time"].replace("Z", "+00:00"))
            l = dt.datetime.fromisoformat(p["last_bag_time"].replace("Z", "+00:00"))
            pts.append((pax, (l - f).total_seconds() / 60))
        assert len(pts) >= 6, len(pts)
        pts.sort()
        half = len(pts) // 2
        lo = statistics.mean(w for _, w in pts[:half])
        hi = statistics.mean(w for _, w in pts[-half:])
        print(f"low-pax avg window {lo:.1f}m vs high-pax avg window {hi:.1f}m")
        assert hi > lo, f"higher passenger flights not longer: lo={lo} hi={hi}"

    def test_domestic_arrival_has_baggage(self):
        fl = requests.get(f"{API}/flights/search",
                          params={"direction": "arrival", "intl": "false", "limit": 25}, timeout=60).json()["flights"]
        assert fl, "no domestic arrivals"
        found = None
        for f in fl[:15]:
            d = requests.get(f"{API}/flights/{f['flight_id']}/journey-forecast", timeout=60).json()
            if d.get("baggage"):
                found = (f, d)
                break
        assert found, "no DOMESTIC arrival returned a baggage block"
        b = found[1]["baggage"]
        assert b["first_bag_time"] and b["last_bag_time"]
        assert "carousel_number" not in b, b

    def test_passenger_baggage_includes_bag_count(self):
        fl = requests.get(f"{API}/flights/search",
                          params={"direction": "arrival", "limit": 20}, timeout=60).json()["flights"]
        missing = []
        checked = 0
        for f in fl:
            d = requests.get(f"{API}/flights/{f['flight_id']}/journey-forecast", timeout=60).json()
            b = d.get("baggage")
            if not b:
                continue
            checked += 1
            if b.get("bag_count") in (None, 0):
                missing.append((f["flight_number"], b.get("bag_count")))
            if checked >= 5:
                break
        assert checked, "no baggage blocks found"
        assert not missing, f"bag_count null/0 in passenger baggage block: {missing}"

class TestJourneyForecast:
    def test_departure_steps_have_base_time(self):
        fl = requests.get(f"{API}/flights/search",
                          params={"direction": "departure", "limit": 12}, timeout=60).json()["flights"]
        assert fl
        checked = 0
        for f in fl:
            d = requests.get(f"{API}/flights/{f['flight_id']}/journey-forecast", timeout=60).json()
            steps = d.get("steps") or []
            if not steps:
                continue
            checked += 1
            zero = [s.get("name") for s in steps if float(s["wait_minutes"]) <= 0]
            print(f['flight_number'], [(s.get('name'), s['wait_minutes']) for s in steps])
            assert not zero, f"steps with 0 wait_minutes: {zero}"
            for s in steps:
                assert float(s["wait_minutes"]) >= 1, s
            if checked >= 4:
                break
        assert checked >= 3, checked

class TestImpact:
    def test_impact_shape(self):
        r = requests.get(f"{API}/analytics/impact", timeout=90)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert "rows" in d and isinstance(d["rows"], list) and d["rows"]
        assert "total_pax_minutes_saved" in d
        assert isinstance(d["total_pax_minutes_saved"], (int, float))
        assert d["total_pax_minutes_saved"] >= 0
        assert "zones_understaffed" in d
        assert isinstance(d["zones_understaffed"], (int, float, list))
        anomalies = []
        for row in d["rows"]:
            for k in ("wait_now_min", "wait_optimized_min"):
                assert k in row, row
                assert isinstance(row[k], (int, float))
            if row["wait_optimized_min"] > row["wait_now_min"] + 0.001:
                anomalies.append((row["zone_id"], row["wait_now_min"], row["wait_optimized_min"],
                                  row["counters_open"], row["recommended_counters"]))
            if row["recommended_counters"] > row["counters_open"]:
                assert row["wait_optimized_min"] <= row["wait_now_min"] + 0.001, row
        if anomalies:
            print("ANOMALY: wait_optimized_min > wait_now_min for over-staffed zones:", anomalies)
        print("impact total saved:", d["total_pax_minutes_saved"], "rows:", len(d["rows"]))

    def test_no_mongo_id_leak(self):
        txt = requests.get(f"{API}/analytics/impact", timeout=90).text
        assert '"_id"' not in txt

class TestSearchFilters:
    RANGES = {"morning": (6, 11), "afternoon": (12, 16), "evening": (17, 20), "night": (21, 23)}

    @pytest.mark.parametrize("period", ["morning", "afternoon", "evening", "night"])
    def test_period_filter(self, period):
        r = requests.get(f"{API}/flights/search", params={"period": period, "limit": 40}, timeout=60)
        assert r.status_code == 200, r.text[:300]
        fl = r.json()["flights"]
        assert fl, f"no flights for period={period}"
        hours = set()
        for f in fl:
            ts = f.get("std") or f.get("sta") or f.get("etd") or f.get("eta")
            assert ts, f
            hours.add(int(ts[11:13]))
        print(period, "hours:", sorted(hours))
        rng = self.RANGES[period]
        assert min(hours) >= rng[0] and max(hours) <= rng[1], sorted(hours)

    def test_direction_and_intl_filters(self):
        for direction in ("arrival", "departure"):
            fl = requests.get(f"{API}/flights/search",
                              params={"direction": direction, "limit": 25}, timeout=60).json()["flights"]
            assert fl and all(f["direction"] == direction for f in fl)
        for intl, expect in (("true", True), ("false", False)):
            fl = requests.get(f"{API}/flights/search",
                              params={"intl": intl, "limit": 25}, timeout=60).json()["flights"]
            assert fl and all(bool(f["is_international"]) == expect for f in fl)

class TestCongestionMix:
    def test_zone_level_mix(self):
        r = requests.get(f"{API}/congestion/zones", timeout=90)
        assert r.status_code == 200
        zones = r.json()["zones"]
        levels = [z["crowd_level"] for z in zones]
        print("levels:", levels)
        assert set(levels) <= {"normal", "medium", "heavy"}
        assert len(set(levels)) > 1, f"all zones same level: {levels}"

class TestWebSocket:
    @pytest.mark.asyncio
    async def test_ws_connected_and_tick(self):
        url = BASE.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws/live"
        async with websockets.connect(url, open_timeout=30, close_timeout=5) as ws:
            first = json.loads(await ws.recv())
            print("first ws msg:", first)
            assert first.get("type") == "connected", first
            import asyncio
            try:
                msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=40))
            except asyncio.TimeoutError:
                pytest.fail("no tick message received within 40s")
            print("second ws msg:", str(msg)[:200])
            assert msg.get("type") == "tick", msg

import datetime as dt
import os
import uuid

import pytest
import requests
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

def _iso(v):
    return dt.datetime.fromisoformat(v.replace("Z", "+00:00"))

class TestLockoutFix:
    def test_lockout_after_5_and_correct_password_blocked(self):
        email = f"TEST_it3_bf_{uuid.uuid4().hex[:8]}@example.com"
        pwd = "Aa@123456"
        reg = requests.post(f"{API}/auth/register",
                            json={"email": email, "password": pwd, "name": "TEST BF"}, timeout=30)
        assert reg.status_code in (200, 201), reg.text[:300]
        otp = test_otp(reg.json())
        assert requests.post(f"{API}/auth/otp/verify",
                             json={"email": email, "otp": otp}, timeout=30).status_code == 200
        codes = [requests.post(f"{API}/auth/login", json={"email": email, "password": "wrong"},
                               timeout=30).status_code for _ in range(6)]
        assert codes[:5] == [401] * 5, codes
        assert codes[5] == 429, codes
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": pwd}, timeout=30)
        assert r.status_code == 429, r.status_code

    def test_correct_login_works_after_clearing_attempts(self):
        email = f"TEST_it3_ok_{uuid.uuid4().hex[:8]}@example.com"
        pwd = "Aa@123456"
        reg = requests.post(f"{API}/auth/register",
                            json={"email": email, "password": pwd, "name": "TEST OK"}, timeout=30)
        otp = test_otp(reg.json())
        requests.post(f"{API}/auth/otp/verify", json={"email": email, "otp": otp}, timeout=30)
        for _ in range(3):
            assert requests.post(f"{API}/auth/login", json={"email": email, "password": "bad"},
                                 timeout=30).status_code == 401
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": email, "password": pwd}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        me = s.get(f"{API}/auth/me", timeout=30)
        assert me.status_code == 200 and me.json()["user"]["email"].lower() == email.lower()

    def test_admin_login_still_works(self, staff):
        assert staff.get(f"{API}/auth/me", timeout=30).json()["user"]["role"] == "admin"

class TestBagCount:
    @pytest.mark.parametrize("intl", ["true", "false"])
    def test_journey_forecast_bag_count_int(self, intl):
        fl = requests.get(f"{API}/flights/search",
                          params={"direction": "arrival", "intl": intl, "limit": 20},
                          timeout=60).json()["flights"]
        assert fl, f"no arrivals intl={intl}"
        checked = 0
        for f in fl[:8]:
            r = requests.get(f"{API}/flights/{f['flight_id']}/journey-forecast", timeout=30)
            assert r.status_code == 200, r.text[:200]
            bag = r.json().get("baggage")
            assert bag, f"no baggage block for {f['flight_number']}"
            assert isinstance(bag.get("bag_count"), int), (f["flight_number"], bag)
            assert bag["bag_count"] > 0, (f["flight_number"], bag)
            assert "carousel_number" not in bag and "carousel_id" not in bag, bag
            checked += 1
        assert checked >= 3, checked

class TestPredictionAuth:
    def test_unauthenticated_blocked(self):
        asg = requests.get(f"{API}/baggage/assignments", timeout=60).json()["assignments"]
        fid = asg[0]["flight_id"]
        r = requests.get(f"{API}/baggage/flights/{fid}/prediction", timeout=30)
        assert r.status_code in (401, 403), (r.status_code, r.text[:200])

    def test_passenger_blocked(self):
        s = requests.Session()
        email = f"TEST_it3_pax_{uuid.uuid4().hex[:8]}@example.com"
        reg = s.post(f"{API}/auth/register",
                     json={"email": email, "password": "Aa@123456", "name": "TEST Pax"}, timeout=30)
        s.post(f"{API}/auth/otp/verify", json={"email": email, "otp": test_otp(reg.json())}, timeout=30)
        asg = requests.get(f"{API}/baggage/assignments", timeout=60).json()["assignments"]
        r = s.get(f"{API}/baggage/flights/{asg[0]['flight_id']}/prediction", timeout=30)
        assert r.status_code == 403, (r.status_code, r.text[:200])

    def test_admin_allowed_with_carousel(self, staff):
        asg = requests.get(f"{API}/baggage/assignments", timeout=60).json()["assignments"]
        r = staff.get(f"{API}/baggage/flights/{asg[0]['flight_id']}/prediction", timeout=30)
        assert r.status_code == 200, r.text[:200]
        d = r.json()
        assert d.get("carousel_number"), d
        assert d.get("predicted_first_bag_time") and d.get("predicted_last_bag_time")
        assert "_id" not in d

class TestDelayShiftsAssignmentWindow:
    def test_window_shifts_and_resets(self, staff):
        asg = requests.get(f"{API}/baggage/assignments", timeout=60).json()["assignments"]
        fid = asg[0]["flight_id"]
        staff.post(f"{API}/baggage/flights/{fid}/delay", json={"additional_minutes": 0}, timeout=30)
        target = next(a for a in requests.get(f"{API}/baggage/assignments", timeout=60)
                      .json()["assignments"] if a["flight_id"] == fid)
        before_start, before_end = _iso(target["window_start"]), _iso(target["window_end"])
        try:
            r = staff.post(f"{API}/baggage/flights/{fid}/delay",
                           json={"additional_minutes": 9}, timeout=30)
            assert r.status_code == 200, r.text[:200]
            row = next(a for a in requests.get(f"{API}/baggage/assignments", timeout=60)
                       .json()["assignments"] if a["flight_id"] == fid)
            after_start, after_end = _iso(row["window_start"]), _iso(row["window_end"])
            assert round((after_start - before_start).total_seconds() / 60) == 9, \
                (before_start, after_start)
            assert round((after_end - before_end).total_seconds() / 60) == 9, (before_end, after_end)
        finally:
            staff.post(f"{API}/baggage/flights/{fid}/delay", json={"additional_minutes": 0}, timeout=30)
            row = next(a for a in requests.get(f"{API}/baggage/assignments", timeout=60)
                       .json()["assignments"] if a["flight_id"] == fid)
            assert _iso(row["window_start"]) == before_start

class TestAnalyticsClamps:
    def test_impact_optimized_never_worse(self):
        r = requests.get(f"{API}/analytics/impact", timeout=60)
        assert r.status_code == 200
        body = r.json()
        rows = body.get("rows") or body.get("zones") or body.get("impact") or []
        assert rows, r.json()
        bad = [z for z in rows if z["wait_optimized_min"] > z["wait_now_min"] + 1e-6]
        assert not bad, bad

    def test_congestion_1h_no_future_buckets(self):
        r = requests.get(f"{API}/analytics/congestion", params={"range": "1h"}, timeout=60)
        assert r.status_code == 200
        series = r.json()["series"]
        now = dt.datetime.utcnow()
        future = []
        for x in series:
            b = x["bucket"]
            try:
                ts = dt.datetime.fromisoformat(b.replace("Z", ""))
            except ValueError:
                continue
            if ts > now + dt.timedelta(minutes=5):
                future.append(b)
        assert not future, f"future buckets returned: {future} (utcnow={now.isoformat()})"

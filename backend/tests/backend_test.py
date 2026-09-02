import os
import re
import time
import uuid
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

from otp_helper import test_otp

frontend_env = dotenv_values("../frontend/.env") if os.path.exists("../frontend/.env") else {}
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL") or "http://127.0.0.1:8000"
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"

def _creds():
    p = Path("/app/memory/test_credentials.md")
    c = p.read_text()
    e = re.search(r'(?im)^\s*[-*]?\s*Email:\s*`?([^`\s]+)', c)
    pw = re.search(r'(?im)^\s*[-*]?\s*Password:\s*`?([^`\s]+)', c)
    return {"email": e.group(1), "password": pw.group(1)}

ADMIN = _creds()

@pytest.fixture(scope="session")
def admin_client():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=ADMIN, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"Admin login failed {r.status_code}: {r.text[:300]}")
    d = r.json()
    assert d["user"]["role"] == "admin", d["user"]
    return s

@pytest.fixture(scope="session")
def passenger_client():
    s = requests.Session()
    email = f"test_pax_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "PaxPass@2026", "name": "TEST Pax"}, timeout=30)
    assert r.status_code == 200, r.text[:300]
    otp = test_otp(r.json())
    assert r.json()["role"] == "passenger"
    v = s.post(f"{API}/auth/otp/verify", json={"email": email, "otp": otp}, timeout=30)
    assert v.status_code == 200, v.text[:300]
    s.email = email
    return s

class TestAuth:
    def test_anonymous_me_401(self):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 401

    def test_passenger_register_verify_me(self, passenger_client):
        r = passenger_client.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["role"] == "passenger"
        assert u["otp_verified"] is True
        assert "_id" not in u

    def test_cookies_httponly_set(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json=ADMIN, timeout=30)
        assert r.status_code == 200
        raw = r.headers.get("set-cookie", "") or ""
        combined = " ".join(v for k, v in r.raw.headers.items() if k.lower() == "set-cookie") or raw
        assert "access_token" in combined and "HttpOnly" in combined, combined[:300]
        assert "refresh_token" in combined

    def test_duplicate_email_rejected(self, passenger_client):
        r = requests.post(f"{API}/auth/register", json={
            "email": passenger_client.email, "password": "x", "name": "dup"}, timeout=30)
        assert r.status_code == 400

    def test_wrong_otp_rejected(self):
        email = f"test_otp_{uuid.uuid4().hex[:8]}@example.com"
        requests.post(f"{API}/auth/register", json={"email": email, "password": "Aa@12345", "name": "T"}, timeout=30)
        r = requests.post(f"{API}/auth/otp/verify", json={"email": email, "otp": "000000"}, timeout=30)
        assert r.status_code == 400

    def test_unverified_login_403(self):
        email = f"test_unv_{uuid.uuid4().hex[:8]}@example.com"
        requests.post(f"{API}/auth/register", json={"email": email, "password": "Aa@12345", "name": "T"}, timeout=30)
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": "Aa@12345"}, timeout=30)
        assert r.status_code == 403

    def test_bcrypt_hash_format(self):
        import asyncio, sys
        sys.path.insert(0, "/app/backend")
        from motor.motor_asyncio import AsyncIOMotorClient
        from dotenv import dotenv_values as dv
        env = dv("/app/backend/.env")

        async def go():
            cli = AsyncIOMotorClient(env["MONGO_URL"])
            u = await cli[env["DB_NAME"]].users.find_one({"email": ADMIN["email"]})
            cli.close()
            return u
        u = asyncio.get_event_loop().run_until_complete(go()) if False else asyncio.run(go())
        assert u is not None, "admin not seeded"
        assert u["password_hash"].startswith("$2b$"), u["password_hash"][:10]

    def test_refresh_and_logout(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json=ADMIN, timeout=30)
        r = s.post(f"{API}/auth/refresh", timeout=30)
        assert r.status_code == 200 and r.json()["user"]["role"] == "admin"
        assert s.post(f"{API}/auth/logout", timeout=30).status_code == 200
        assert s.get(f"{API}/auth/me", timeout=30).status_code == 401

    def test_brute_force_lockout_then_reset(self):
        email = f"test_bf_{uuid.uuid4().hex[:8]}@example.com"
        reg = requests.post(f"{API}/auth/register", json={"email": email, "password": "Aa@12345", "name": "T"}, timeout=30)
        otp = test_otp(reg.json())
        requests.post(f"{API}/auth/otp/verify", json={"email": email, "otp": otp}, timeout=30)
        codes = []
        for _ in range(7):
            codes.append(requests.post(f"{API}/auth/login", json={"email": email, "password": "wrong"}, timeout=30).status_code)
        assert 429 in codes, codes
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": "Aa@12345"}, timeout=30)
        assert r.status_code == 429, r.status_code

    def test_forgot_password_generic(self):
        r1 = requests.post(f"{API}/auth/forgot-password", json={"email": ADMIN["email"]}, timeout=45)
        r2 = requests.post(f"{API}/auth/forgot-password", json={"email": f"nobody_{uuid.uuid4().hex[:6]}@example.com"}, timeout=45)
        assert r1.status_code == r2.status_code == 200
        assert r1.json() == r2.json(), (r1.json(), r2.json())

    def test_reset_password_invalid_token(self):
        r = requests.post(f"{API}/auth/reset-password", json={"token": "bogus-token", "password": "New@12345"}, timeout=30)
        assert r.status_code == 400
        assert "Invalid or expired" in r.json().get("detail", "")

    def test_reset_token_stored_hashed(self):
        import asyncio
        from motor.motor_asyncio import AsyncIOMotorClient
        from dotenv import dotenv_values as dv
        env = dv("/app/backend/.env")

        async def go():
            cli = AsyncIOMotorClient(env["MONGO_URL"])
            d = await cli[env["DB_NAME"]].password_reset_tokens.find_one({"email": ADMIN["email"]})
            cli.close()
            return d
        d = asyncio.run(go())
        assert d is not None, "no reset token stored"
        assert "token" not in d and "token_hash" in d
        assert len(d["token_hash"]) == 64

class TestStaffInvite:
    def test_staff_register_with_invite(self):
        email = f"test_staff_{uuid.uuid4().hex[:8]}@example.com"
        s = requests.Session()
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "Staff@2026", "name": "TEST Staff",
                                                "invite_code": "AERO-STAFF-02"}, timeout=30)
        if r.status_code == 400 and "invite" in r.text.lower():
            pytest.skip("AERO-STAFF-02 already consumed by a previous run")
        assert r.status_code == 200, r.text[:300]
        assert r.json()["role"] == "baggage_ops"
        v = s.post(f"{API}/auth/otp/verify", json={"email": email, "otp": test_otp(r.json())}, timeout=30)
        assert v.status_code == 200
        assert v.json()["user"]["role"] == "baggage_ops"
        assert s.get(f"{API}/alerts", timeout=30).status_code == 200
        r2 = requests.post(f"{API}/auth/register", json={
            "email": f"test_staff2_{uuid.uuid4().hex[:6]}@example.com", "password": "Staff@2026",
            "name": "T2", "invite_code": "AERO-STAFF-02"}, timeout=30)
        assert r2.status_code == 400

    def test_invalid_invite_code(self):
        r = requests.post(f"{API}/auth/register", json={
            "email": f"test_bad_{uuid.uuid4().hex[:6]}@example.com", "password": "Staff@2026",
            "name": "T", "invite_code": "NOT-A-CODE"}, timeout=30)
        assert r.status_code == 400

class TestRBAC:
    @pytest.mark.parametrize("method,path,body", [
        ("get", "/alerts", None),
        ("post", "/congestion/zones/security-dom/staffing-recommendation", {"counters_open": 5}),
        ("get", "/admin/carousels", None),
        ("get", "/analytics/baggage", None),
        ("get", "/analytics/alerts", None),
    ])
    def test_passenger_forbidden(self, passenger_client, method, path, body):
        r = getattr(passenger_client, method)(f"{API}{path}", json=body, timeout=30)
        assert r.status_code == 403, f"{path} -> {r.status_code}"

    def test_anonymous_unauthorized(self):
        assert requests.get(f"{API}/alerts", timeout=30).status_code == 401

    def test_admin_allowed(self, admin_client):
        for p in ["/alerts", "/admin/carousels", "/analytics/baggage", "/analytics/alerts"]:
            assert admin_client.get(f"{API}{p}", timeout=30).status_code == 200, p

class TestFlights:
    def test_search(self):
        r = requests.get(f"{API}/flights/search", params={"number": "6E"}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["count"] > 0 and len(d["flights"]) > 0
        f = d["flights"][0]
        for k in ("flight_id", "flight_number", "direction", "is_international"):
            assert k in f
        assert "_id" not in f

    def test_flight_404(self):
        assert requests.get(f"{API}/flights/does-not-exist", timeout=30).status_code == 404

    def test_departure_journey_forecast(self):
        fl = requests.get(f"{API}/flights/search", params={"direction": "departure", "limit": 40}, timeout=30).json()["flights"]
        assert fl
        r = requests.get(f"{API}/flights/{fl[0]['flight_id']}/journey-forecast", timeout=60)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["direction"] == "departure"
        assert len(d["steps"]) >= 3
        for s in d["steps"]:
            assert s["crowd_level"] in ("normal", "medium", "heavy")
            assert isinstance(s["wait_minutes"], (int, float)) and s["wait_minutes"] >= 0
            assert s["mode"] in ("predictive", "realtime", "real-time", "hybrid")
            assert s["recommended_counters"] >= 1
        assert d["suggested_airport_arrival"]
        assert d["total_journey_minutes"] > 0

    def test_intl_arrival_forecast_baggage(self):
        fl = requests.get(f"{API}/flights/search", params={"direction": "arrival", "intl": "true", "limit": 40},
                          timeout=30).json()["flights"]
        assert fl, "no intl arrivals seeded"
        found = None
        for f in fl:
            d = requests.get(f"{API}/flights/{f['flight_id']}/journey-forecast", timeout=60).json()
            if d.get("baggage"):
                found = d
                break
        assert found, "no arrival returned baggage block"
        b = found["baggage"]
        assert "carousel_number" not in b, b
        assert b["first_bag_time"] and b["last_bag_time"] and b.get("bag_count")
        assert b["first_bag_time"] < b["last_bag_time"]
        assert len(found["steps"]) >= 1

class TestCongestion:
    def test_zones(self):
        r = requests.get(f"{API}/congestion/zones", timeout=60)
        assert r.status_code == 200
        zones = r.json()["zones"]
        assert len(zones) == 9, len(zones)
        for z in zones:
            for k in ("zone_id", "crowd_level", "predicted_count", "recommended_counters", "mode"):
                assert k in z, (z.get("zone_id"), k)
            assert z["crowd_level"] in ("normal", "medium", "heavy")
            assert z["predicted_count"] >= 0

    def test_zone_forecast_series(self):
        r = requests.get(f"{API}/congestion/zones/security-dom/forecast", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["zone"]["zone_id"] == "security-dom"
        assert len(d["series"]) >= 10
        offs = [p["offset_min"] for p in d["series"]]
        assert offs == sorted(offs)
        assert all("predicted_count" in p and "timestamp" in p for p in d["series"])

    def test_zone_forecast_404(self):
        assert requests.get(f"{API}/congestion/zones/nope/forecast", timeout=30).status_code == 404

    def test_staffing_recommendation_persists(self, admin_client):
        before = admin_client.get(f"{API}/congestion/zones", timeout=60).json()["zones"]
        z = [x for x in before if x["zone_id"] == "checkin-dom-a"][0]
        target = (z["counters_open"] % 10) + 3
        r = admin_client.post(f"{API}/congestion/zones/checkin-dom-a/staffing-recommendation",
                              json={"counters_open": target}, timeout=30)
        assert r.status_code == 200 and r.json()["counters_open"] == target
        after = admin_client.get(f"{API}/congestion/zones", timeout=60).json()["zones"]
        assert [x for x in after if x["zone_id"] == "checkin-dom-a"][0]["counters_open"] == target
        admin_client.post(f"{API}/congestion/zones/checkin-dom-a/staffing-recommendation",
                          json={"counters_open": z["counters_open"]}, timeout=30)

    def test_staffing_clamped(self, admin_client):
        r = admin_client.post(f"{API}/congestion/zones/security-dom/staffing-recommendation",
                              json={"counters_open": 99999}, timeout=30)
        assert r.status_code == 200
        assert r.json()["counters_open"] <= 200

class TestBaggage:
    def test_assignments(self):
        r = requests.get(f"{API}/baggage/assignments", timeout=60)
        assert r.status_code == 200
        asg = r.json()["assignments"]
        assert len(asg) > 0
        a = asg[0]
        assert a["carousel_number"] and a["flight"] and a["flight"]["flight_number"]
        assert "_id" not in a

    def test_delay_shifts_times(self, admin_client):
        asg = requests.get(f"{API}/baggage/assignments", timeout=60).json()["assignments"]
        fid = asg[0]["flight_id"]
        before = admin_client.get(f"{API}/baggage/flights/{fid}/prediction", timeout=30).json()
        r = admin_client.post(f"{API}/baggage/flights/{fid}/delay", json={"additional_minutes": 12}, timeout=30)
        assert r.status_code == 200
        after = admin_client.get(f"{API}/baggage/flights/{fid}/prediction", timeout=30).json()
        assert after["staff_added_delay_minutes"] == 12
        assert after["predicted_first_bag_time"] > before["predicted_first_bag_time"]
        assert after["predicted_last_bag_time"] > before["predicted_last_bag_time"]
        rr = admin_client.post(f"{API}/baggage/flights/{fid}/delay", json={"additional_minutes": 0}, timeout=30)
        assert rr.status_code == 200
        back = admin_client.get(f"{API}/baggage/flights/{fid}/prediction", timeout=30).json()
        assert back["predicted_first_bag_time"] == before["predicted_first_bag_time"]

    def test_delay_404(self, admin_client):
        r = admin_client.post(f"{API}/baggage/flights/nope/delay", json={"additional_minutes": 5}, timeout=30)
        assert r.status_code == 404

    def test_reassign(self, admin_client):
        asg = requests.get(f"{API}/baggage/assignments", timeout=60).json()["assignments"]
        a = asg[0]
        carousels = admin_client.get(f"{API}/admin/carousels", timeout=30).json()["carousels"]
        target = next(c for c in carousels if c["carousel_id"] != a["carousel_id"])
        r = admin_client.post(f"{API}/baggage/assignments/{a['id']}/reassign",
                              json={"carousel_id": target["carousel_id"]}, timeout=30)
        assert r.status_code == 200
        again = requests.get(f"{API}/baggage/assignments", timeout=60).json()["assignments"]
        moved = next(x for x in again if x["id"] == a["id"])
        assert moved["carousel_number"] == target["carousel_number"]
        admin_client.post(f"{API}/baggage/assignments/{a['id']}/reassign",
                          json={"carousel_id": a["carousel_id"]}, timeout=30)

    def test_carousel_status_endpoint(self, admin_client):
        c = admin_client.get(f"{API}/admin/carousels", timeout=30).json()["carousels"][0]
        r = requests.get(f"{API}/baggage/carousels/{c['carousel_id']}/status", timeout=30)
        assert r.status_code == 200
        assert r.json()["carousel"]["carousel_number"] == c["carousel_number"]

class TestCarouselCRUD:
    def test_crud_cycle(self, admin_client):
        cr = admin_client.post(f"{API}/admin/carousels", json={"carousel_number": "TEST_C9"}, timeout=30)
        assert cr.status_code == 200
        cid = cr.json()["carousel_id"]
        lst = admin_client.get(f"{API}/admin/carousels", timeout=30).json()["carousels"]
        assert any(c["carousel_id"] == cid and c["carousel_number"] == "TEST_C9" for c in lst)
        p = admin_client.patch(f"{API}/admin/carousels/{cid}", json={"status": "maintenance"}, timeout=30)
        assert p.status_code == 200
        lst = admin_client.get(f"{API}/admin/carousels", timeout=30).json()["carousels"]
        assert next(c for c in lst if c["carousel_id"] == cid)["status"] == "maintenance"
        assert admin_client.patch(f"{API}/admin/carousels/{uuid.uuid4().hex}", json={"status": "free"},
                                  timeout=30).status_code == 404
        assert admin_client.delete(f"{API}/admin/carousels/{cid}", timeout=30).status_code == 200
        lst = admin_client.get(f"{API}/admin/carousels", timeout=30).json()["carousels"]
        assert not any(c["carousel_id"] == cid for c in lst)

class TestAlerts:
    def test_list_and_lifecycle(self, admin_client):
        r = admin_client.get(f"{API}/alerts", timeout=30)
        assert r.status_code == 200
        alerts = r.json()["alerts"]
        assert isinstance(alerts, list)
        if not alerts:
            pytest.skip("no alerts generated yet")
        for a in alerts[:5]:
            for k in ("id", "alert_type", "severity", "status", "triggered_at"):
                assert k in a
        open_alerts = [a for a in alerts if a["status"] == "open"]
        if not open_alerts:
            pytest.skip("no open alerts to acknowledge")
        aid = open_alerts[0]["id"]
        ack = admin_client.post(f"{API}/alerts/{aid}/acknowledge", timeout=30)
        assert ack.status_code == 200
        cur = admin_client.get(f"{API}/alerts", timeout=30).json()["alerts"]
        assert next(a for a in cur if a["id"] == aid)["status"] in ("acknowledged", "resolved")
        res = admin_client.post(f"{API}/alerts/{aid}/resolve", timeout=30)
        assert res.status_code == 200
        cur = admin_client.get(f"{API}/alerts", timeout=30).json()["alerts"]
        assert next(a for a in cur if a["id"] == aid)["status"] == "resolved"

    def test_ack_unknown_alert_404(self, admin_client):
        assert admin_client.post(f"{API}/alerts/{uuid.uuid4().hex}/acknowledge", timeout=30).status_code == 404

    def test_filter_by_status(self, admin_client):
        r = admin_client.get(f"{API}/alerts", params={"status": "open"}, timeout=30)
        assert r.status_code == 200
        assert all(a["status"] == "open" for a in r.json()["alerts"])

class TestAnalytics:
    def test_congestion_analytics(self):
        r = requests.get(f"{API}/analytics/congestion", params={"range": "24h"}, timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["range"] == "24h"
        assert len(d["series"]) > 0, "no congestion history"
        s = d["series"][0]
        for k in ("zone_id", "bucket", "avg_count", "avg_wait_min", "peak_count"):
            assert k in s

    def test_heatmap(self):
        r = requests.get(f"{API}/analytics/congestion/heatmap", params={"range": "7d"}, timeout=60)
        assert r.status_code == 200
        cells = r.json()["cells"]
        assert len(cells) > 0
        assert all(0 <= c["dow"] <= 6 and 0 <= c["hour"] <= 23 for c in cells)

    def test_baggage_analytics(self, admin_client):
        r = admin_client.get(f"{API}/analytics/baggage", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert len(d["carousel_utilization"]) > 0
        assert "bag_stats" in d and "conflicts" in d

    def test_alerts_analytics(self, admin_client):
        r = admin_client.get(f"{API}/analytics/alerts", params={"range": "7d"}, timeout=60)
        assert r.status_code == 200
        d = r.json()
        for k in ("by_type", "by_severity", "by_day", "open"):
            assert k in d

class TestPassengerFeatures:
    def test_saved_flights_crud(self, passenger_client):
        fid = requests.get(f"{API}/flights/search", params={"number": "6E"}, timeout=30).json()["flights"][0]["flight_id"]
        r = passenger_client.post(f"{API}/users/me/saved-flights", json={"flight_id": fid}, timeout=30)
        assert r.status_code == 200
        lst = passenger_client.get(f"{API}/users/me/saved-flights", timeout=30).json()["flights"]
        assert any(f["flight_id"] == fid for f in lst)
        assert passenger_client.delete(f"{API}/users/me/saved-flights/{fid}", timeout=30).status_code == 200
        lst = passenger_client.get(f"{API}/users/me/saved-flights", timeout=30).json()["flights"]
        assert not any(f["flight_id"] == fid for f in lst)

    def test_save_unknown_flight_404(self, passenger_client):
        assert passenger_client.post(f"{API}/users/me/saved-flights", json={"flight_id": "nope"},
                                     timeout=30).status_code == 404

    def test_notify_prefs(self, passenger_client):
        r = passenger_client.patch(f"{API}/users/me/notify-preferences", json={"notify_pre_flight": True}, timeout=30)
        assert r.status_code == 200 and r.json()["notify_pre_flight"] is True
        me = passenger_client.get(f"{API}/auth/me", timeout=30).json()["user"]
        assert me["notify_pre_flight"] is True

    def test_preflight_nudge(self, passenger_client):
        fl = requests.get(f"{API}/flights/search", params={"direction": "departure", "limit": 5},
                          timeout=30).json()["flights"]
        r = passenger_client.post(f"{API}/users/me/preflight-nudge", json={"flight_id": fl[0]["flight_id"]}, timeout=90)
        assert r.status_code == 200, r.text[:300]
        assert r.json()["suggested_airport_arrival"]

    def test_nudge_on_arrival_rejected(self, passenger_client):
        fl = requests.get(f"{API}/flights/search", params={"direction": "arrival", "limit": 5},
                          timeout=30).json()["flights"]
        r = passenger_client.post(f"{API}/users/me/preflight-nudge", json={"flight_id": fl[0]["flight_id"]}, timeout=60)
        assert r.status_code == 400

class TestConfig:
    def test_holidays_and_staffing(self):
        for p in ["/config/holidays", "/config/staffing"]:
            r = requests.get(f"{API}{p}", timeout=30)
            assert r.status_code == 200, p

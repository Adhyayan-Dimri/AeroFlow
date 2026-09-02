import pytest
import os
from datetime import timedelta
from httpx import AsyncClient, ASGITransport
from server import app
from database import db, now, iso, parse_dt
from auth import seed_admin

@pytest.mark.asyncio
async def test_latest_user_and_schedule_rules():
    transport = ASGITransport(app=app)
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}
    async with AsyncClient(transport=transport, base_url="http://test", headers=headers) as ac:
        await seed_admin()

        login_res = await ac.post("/api/auth/login", json={
            "email": os.environ.get("ADMIN_EMAIL", "admin@example.com"),
            "password": os.environ.get("ADMIN_PASSWORD", "admin123")
        })
        assert login_res.status_code == 200
        token = login_res.json().get("token") or login_res.json().get("access_token")
        auth_headers = {**headers, "Authorization": f"Bearer {token}"}

        sample_flight = (await ac.get("/api/flights/search")).json()["flights"][0]
        f_id = sample_flight["flight_id"]
        await ac.post("/api/user/recently-viewed", json={"flight_id": f_id}, headers=auth_headers)
        rec = await ac.get("/api/user/recently-viewed", headers=auth_headers)
        assert len(rec.json().get("flights", [])) >= 1

        clear_res = await ac.delete("/api/user/recently-viewed", headers=auth_headers)
        assert clear_res.status_code == 200
        rec_after = await ac.get("/api/user/recently-viewed", headers=auth_headers)
        assert len(rec_after.json().get("flights", [])) == 0

        search_res = await ac.get("/api/flights/search")
        assert search_res.status_code == 200
        flights = search_res.json().get("flights", [])
        assert len(flights) > 0
        current_time = now()
        for f in flights:
            dt = parse_dt(f.get("std") or f.get("sta"))
            assert dt is not None
            if f.get("direction") == "arrival":
                assert dt >= current_time - timedelta(minutes=120), f"Arrival flight {f['flight_number']} time {dt} is too old compared to {current_time}"
            else:
                assert dt >= current_time - timedelta(minutes=15), f"Departure flight {f['flight_number']} time {dt} is earlier than current time {current_time}"

        admin_res = await ac.get("/api/admin/flights", headers=auth_headers)
        assert admin_res.status_code == 200
        admin_flights = admin_res.json().get("flights", [])
        assert len(admin_flights) > 0
        today_str = now().strftime("%Y-%m-%d")
        for f in admin_flights:
            t = f.get("std") or f.get("sta") or ""
            assert t.startswith(today_str), f"Flight {f['flight_number']} has date {t}, expected {today_str}"

import os
import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from server import app
from database import db, parse_dt, now
from auth import seed_admin

@pytest.mark.asyncio
async def test_admin_flight_delay_and_future_features():
    await seed_admin()
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_pwd = os.environ.get("ADMIN_PASSWORD", "admin123")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"}) as client:

        login_res = await client.post("/api/auth/login", json={
            "email": admin_email,
            "password": admin_pwd
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        data = login_res.json()
        token = data.get("token") or data.get("access_token")
        headers = {"Authorization": f"Bearer {token}"}

        flight = await db.flights.find_one({"direction": "departure"})
        assert flight is not None
        flight_id = flight["flight_id"]
        orig_std = parse_dt(flight.get("std"))

        delay_res = await client.post(f"/api/admin/flights/{flight_id}/delay", headers=headers, json={
            "additional_minutes": 45,
            "reason": "Air Traffic Control (ATC) Hold",
            "new_status": "delayed"
        })
        assert delay_res.status_code == 200, f"Delay failed: {delay_res.text}"
        delay_data = delay_res.json()
        assert delay_data["ok"] is True
        assert delay_data["total_delay_minutes"] >= 45
        assert delay_data["status"] == "delayed"

        upd_flight = await db.flights.find_one({"flight_id": flight_id})
        assert upd_flight["status"] == "delayed"
        assert upd_flight["flight_delay_minutes"] >= 45
        new_etd = parse_dt(upd_flight["etd"])
        assert new_etd > orig_std

        cong_res = await client.get("/api/congestion/zones")
        assert cong_res.status_code == 200
        zones = cong_res.json()["zones"]
        assert len(zones) >= 8
        for z in zones:

            assert z["predicted_count"] >= 15, f"Zone {z['name']} had unrealistically low count: {z['predicted_count']}"
            assert z["predicted_wait_seconds"] >= 45

        future_cong_res = await client.get("/api/congestion/zones", params={"date": "2026-09-03"})
        assert future_cong_res.status_code == 200
        fut_zones = future_cong_res.json()["zones"]
        assert len(fut_zones) >= 8

        car_res = await client.get("/api/admin/carousels", headers=headers, params={"date": "2026-09-03"})
        assert car_res.status_code == 200
        carousels = car_res.json()["carousels"]
        assert len(carousels) >= 14

        for c in carousels:
            if c.get("carousel_number") in ("AC-13", "AC-14"):
                assert c["is_emergency_reserve"] is True
                assert c["status"] in ("free", "maintenance")

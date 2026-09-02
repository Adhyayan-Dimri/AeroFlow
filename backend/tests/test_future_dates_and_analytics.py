import pytest
import os
from httpx import AsyncClient, ASGITransport
from server import app
from database import db
from auth import seed_admin

@pytest.mark.asyncio
async def test_future_dates_and_analytics_suite():
    await seed_admin()
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_pwd = os.environ.get("ADMIN_PASSWORD", "admin123")
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", headers=headers) as ac:

        login_res = await ac.post("/api/auth/login", json={"email": admin_email, "password": admin_pwd})
        assert login_res.status_code == 200
        token = login_res.json().get("token") or login_res.json().get("access_token")
        auth_headers = {**headers, "Authorization": f"Bearer {token}"}

        res_sep = await ac.get("/api/flights/search?date=2026-09-20&limit=10")
        assert res_sep.status_code == 200
        data_sep = res_sep.json()
        assert len(data_sep["flights"]) > 0
        for f in data_sep["flights"]:
            flight_date = (f.get("std") or f.get("sta"))[:10]
            assert flight_date == "2026-09-20"

        res_dec = await ac.get("/api/flights/search?date=2026-12-02&limit=10")
        assert res_dec.status_code == 200
        data_dec = res_dec.json()
        assert len(data_dec["flights"]) > 0
        for f in data_dec["flights"]:
            flight_date = (f.get("std") or f.get("sta"))[:10]
            assert flight_date == "2026-12-02"

        res_carousels = await ac.get("/api/admin/carousels?date=2026-09-20", headers=auth_headers)
        assert res_carousels.status_code == 200
        assert "carousels" in res_carousels.json()

        res_asg = await ac.get("/api/baggage/assignments?date=2026-09-20")
        assert res_asg.status_code == 200
        assert "assignments" in res_asg.json()

        res_cong = await ac.get("/api/analytics/congestion?range=24h")
        assert res_cong.status_code == 200
        assert "series" in res_cong.json()

        res_heat = await ac.get("/api/analytics/congestion/heatmap?range=7d")
        assert res_heat.status_code == 200
        assert "cells" in res_heat.json()

        res_bag = await ac.get("/api/analytics/baggage?range=24h", headers=auth_headers)
        assert res_bag.status_code == 200
        assert "carousel_utilization" in res_bag.json()

        res_alerts = await ac.get("/api/analytics/alerts?range=7d", headers=auth_headers)
        assert res_alerts.status_code == 200
        assert "by_severity" in res_alerts.json()

        res_impact = await ac.get("/api/analytics/impact-timeline")
        assert res_impact.status_code == 200
        timeline = res_impact.json().get("timeline", [])
        assert len(timeline) == 24

import pytest
import os
from httpx import AsyncClient, ASGITransport
from server import app
from database import db
from auth import seed_admin

@pytest.mark.asyncio
async def test_staff_deployment_live_alert():
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

        zones_res = await ac.get("/api/congestion/zones")
        assert zones_res.status_code == 200
        zones = zones_res.json().get("zones", [])
        assert len(zones) > 0
        target_zone = zones[0]
        zid = target_zone["zone_id"]

        deploy_res = await ac.post(f"/api/congestion/zones/{zid}/staffing-recommendation",
                                   json={"counters_open": 35},
                                   headers=auth_headers)
        assert deploy_res.status_code == 200
        deploy_data = deploy_res.json()
        assert deploy_data["counters_open"] == 35
        assert "alert_id" in deploy_data
        alert_id = deploy_data["alert_id"]

        alerts_res = await ac.get("/api/alerts", headers=auth_headers)
        assert alerts_res.status_code == 200
        alerts = alerts_res.json().get("alerts", [])
        matching_alert = next((a for a in alerts if a.get("id") == alert_id), None)
        assert matching_alert is not None
        assert matching_alert["alert_type"] == "staff_deployment"
        assert matching_alert["status"] == "open"
        assert "Floor staff requested to report" in matching_alert["message"]

        ack_res = await ac.post(f"/api/alerts/{alert_id}/acknowledge", headers=auth_headers)
        assert ack_res.status_code == 200

        resolve_res = await ac.post(f"/api/alerts/{alert_id}/resolve", headers=auth_headers)
        assert resolve_res.status_code == 200

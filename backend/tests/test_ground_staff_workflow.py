import pytest
import os
from httpx import AsyncClient, ASGITransport
from server import app
from database import db
from auth import seed_admin, create_access_token

@pytest.mark.asyncio
async def test_ground_staff_registration_and_dispatch_flow():
    transport = ASGITransport(app=app)
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}
    async with AsyncClient(transport=transport, base_url="http://test", headers=headers) as ac:
        await seed_admin()

        staff_email = "groundcrew.test@aeroflow.del"
        await db.users.delete_one({"email": staff_email})

        reg_res = await ac.post("/api/auth/register", json={
            "name": "Rajesh Kumar (Ground Crew)",
            "email": staff_email,
            "password": "Password123!",
            "phone": "+919876543210",
            "invite_code": "AERO-GROUND-2026"
        })
        assert reg_res.status_code == 200
        reg_data = reg_res.json()
        assert reg_data.get("role") == "ground_staff"
        assert reg_data.get("otp_required") is True

        user_doc = await db.users.find_one({"email": staff_email})
        assert user_doc is not None
        assert user_doc.get("role") == "ground_staff"

        await db.users.update_one({"email": staff_email}, {"$set": {"otp_verified_at": "2026-09-01T12:00:00Z"}})

        login_res = await ac.post("/api/auth/login", json={
            "email": staff_email,
            "password": "Password123!"
        })
        assert login_res.status_code == 200
        staff_token = login_res.json().get("token") or login_res.json().get("access_token")
        staff_headers = {**headers, "Authorization": f"Bearer {staff_token}"}

        admin_login = await ac.post("/api/auth/login", json={
            "email": os.environ.get("ADMIN_EMAIL", "admin@example.com"),
            "password": os.environ.get("ADMIN_PASSWORD", "admin123")
        })
        admin_token = admin_login.json().get("token") or admin_login.json().get("access_token")
        admin_headers = {**headers, "Authorization": f"Bearer {admin_token}"}

        deploy_res = await ac.post("/api/congestion/zones/security-dom/staffing-recommendation",
                                   json={"counters_open": 32},
                                   headers=admin_headers)
        assert deploy_res.status_code == 200
        alert_id = deploy_res.json().get("alert_id")
        assert alert_id is not None

        enroute_res = await ac.post(f"/api/alerts/{alert_id}/en-route", headers=staff_headers)
        assert enroute_res.status_code == 200
        assert enroute_res.json().get("status") == "en_route"

        onstation_res = await ac.post(f"/api/alerts/{alert_id}/on-station", headers=staff_headers)
        assert onstation_res.status_code == 200
        assert onstation_res.json().get("status") == "on_station"

        alerts_res = await ac.get("/api/alerts", headers=staff_headers)
        assert alerts_res.status_code == 200
        all_alerts = alerts_res.json().get("alerts", [])
        matched = next((a for a in all_alerts if a["id"] == alert_id), None)
        assert matched is not None
        assert matched["status"] == "on_station"
        assert matched.get("en_route_name") is not None
        assert matched.get("on_station_name") is not None

        resolve_res = await ac.post(f"/api/alerts/{alert_id}/resolve", headers=staff_headers)
        assert resolve_res.status_code == 200
        assert resolve_res.json().get("status") == "resolved"

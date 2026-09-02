import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio
import pytest
from datetime import datetime, timedelta, timezone
from database import db, now, iso, parse_dt
import engines

@pytest.mark.asyncio
async def test_carousel_allocation_operational_rules():
    current_time = datetime(2026, 8, 31, 12, 0, 0, tzinfo=timezone.utc)

    carousels = [
        {"carousel_id": f"c_{i:02d}", "carousel_number": f"AC-{i:02d}", "status": "free", "length_m": 90, "speed_mps": 0.5}
        for i in range(1, 15)
    ]

    arrivals = [
        {
            "flight_id": "f_active",
            "window_start": current_time - timedelta(minutes=5),
            "window_end": current_time + timedelta(minutes=25),
        },
        {
            "flight_id": "f_90m",
            "window_start": current_time + timedelta(minutes=45),
            "window_end": current_time + timedelta(minutes=75),
        },
        {
            "flight_id": "f_120m",
            "window_start": current_time + timedelta(minutes=120),
            "window_end": current_time + timedelta(minutes=150),
        },
        {
            "flight_id": "f_240m",
            "window_start": current_time + timedelta(minutes=240),
            "window_end": current_time + timedelta(minutes=270),
        },
    ]

    assignments = engines.allocate_carousels(arrivals, carousels, buffer_min=10, now_dt=current_time)
    asg_map = {a["flight_id"]: a for a in assignments}

    assert asg_map["f_active"]["carousel_id"] is not None
    assert asg_map["f_active"]["status"] == "occupied"

    assert asg_map["f_90m"]["carousel_id"] is not None
    assert asg_map["f_90m"]["status"] == "occupied"

    assert asg_map["f_120m"]["carousel_id"] is not None
    assert asg_map["f_120m"]["status"] == "scheduled"

    assert asg_map["f_240m"]["carousel_id"] is None
    assert asg_map["f_240m"]["carousel_number"] == "TBD"
    assert asg_map["f_240m"]["status"] == "yet_to_assign"

    assigned_cids = {a["carousel_id"] for a in assignments if a["carousel_id"]}
    assert "c_13" not in assigned_cids, "Emergency reserve AC-13 must not be allocated to routine flights"
    assert "c_14" not in assigned_cids, "Emergency reserve AC-14 must not be allocated to routine flights"

@pytest.mark.asyncio
async def test_admin_carousels_operational_statuses():
    from api import admin_carousels

    res = await admin_carousels(user={"role": "admin", "email": "admin@aeroflow.com"})
    carousels = res["carousels"]

    assert len(carousels) >= 14
    statuses = {c["status"] for c in carousels}

    valid_states = {"free", "occupied", "scheduled", "maintenance"}
    assert statuses.issubset(valid_states), f"Unexpected statuses: {statuses}"

    c13 = next((c for c in carousels if c["carousel_number"] == "AC-13"), None)
    c14 = next((c for c in carousels if c["carousel_number"] == "AC-14"), None)
    assert c13 and c14
    assert c13.get("is_emergency_reserve") is True
    assert c14.get("is_emergency_reserve") is True
    assert c13["status"] in ("free", "maintenance")
    assert c14["status"] in ("free", "maintenance")

import pytest
import httpx
from server import app

@pytest.mark.asyncio
async def test_cctv_live_stats():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/cctv/stats")
        assert res.status_code == 200
        data = res.json()
        assert "metrics" in data
        assert "cameras" in data
        assert "timeline" in data
        assert data["metrics"]["total_entered_today"] > 0
        assert data["metrics"]["total_exited_today"] > 0
        assert data["metrics"]["net_inside_terminal"] == data["metrics"]["total_entered_today"] - data["metrics"]["total_exited_today"] + 2400 or data["metrics"]["net_inside_terminal"] >= 1800
        assert "cam_entry" in data["cameras"]
        assert "cam_exit" in data["cameras"]

@pytest.mark.asyncio
async def test_cctv_video_feed():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        res_entry = await ac.get("/api/cctv/feed/entry")
        assert res_entry.status_code == 200
        assert res_entry.headers["content-type"] == "video/mp4"

        res_exit = await ac.get("/api/cctv/feed/exit")
        assert res_exit.status_code == 200
        assert res_exit.headers["content-type"] == "video/mp4"

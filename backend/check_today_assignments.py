import asyncio
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport
from server import app
from database import db, now, iso, parse_dt

async def main():
    transport = ASGITransport(app=app)
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}
    async with AsyncClient(transport=transport, base_url="http://test", headers=headers) as ac:
        current_time = now()
        today_str = current_time.strftime("%Y-%m-%d")
        print("Backend NOW:", iso(current_time), "Today:", today_str)

        res = await ac.get(f"/api/baggage/assignments?date={today_str}")
        asg = res.json().get("assignments", [])
        print(f"\nAssignments for today ({today_str}): count = {len(asg)}")

        near_now = []
        for a in asg:
            ws = parse_dt(a.get("window_start"))
            we = parse_dt(a.get("window_end"))
            f = a.get("flight") or {}
            fnum = f.get("flight_number") or a.get("flight_number")
            cnum = a.get("carousel_number")
            status = a.get("status")
            if ws and abs((ws - current_time).total_seconds()) < 7200:
                near_now.append((fnum, f.get("airline_name"), f.get("origin"), cnum, status, ws, we))

        print(f"\nFlights near 12:00 PM today (count: {len(near_now)}):")
        for fnum, air, orig, cnum, st, ws, we in near_now:
            ws_str = ws.strftime("%H:%M") if ws else "N/A"
            we_str = we.strftime("%H:%M") if we else "N/A"
            delta = (ws - current_time).total_seconds() / 60
            print(f"  Flight: {fnum:<6} | {air:<18} | From: {orig:<15} | Belt: {cnum:<6} | Window: {ws_str} - {we_str} (in {delta:+.0f}m)")

        c_res = await ac.get(f"/api/baggage/carousels/overview?date={today_str}")
        carousels = c_res.json().get("carousels", [])
        print(f"\nCarousels Overview at {iso(current_time)}:")
        for c in carousels:
            cnum = c.get("carousel_number")
            st = c.get("status")
            af = c.get("active_flight") or {}
            af_fnum = af.get("flight_number") or "None"
            print(f"  Belt {cnum:<6} | Status: {st:<10} | Active Flight: {af_fnum}")

if __name__ == "__main__":
    asyncio.run(main())

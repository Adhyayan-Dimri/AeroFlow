import asyncio
from httpx import AsyncClient, ASGITransport
from server import app
from database import now, iso

async def main():
    transport = ASGITransport(app=app)
    headers = {"User-Agent": "Mozilla/5.0"}
    async with AsyncClient(transport=transport, base_url="http://test", headers=headers) as ac:
        current_time = now()
        print("Backend NOW:", iso(current_time))

        b_res = await ac.get("/api/baggage/assignments")
        asgs = b_res.json().get("assignments", [])
        print(f"\nBaggage assignments count: {len(asgs)}")
        if asgs:
            first_asg = asgs[0]
            fnum = first_asg.get("flight", {}).get("flight_number")
            print(f"First active baggage flight: {fnum}")

            s_res = await ac.get(f"/api/flights/search?number={fnum}")
            found = s_res.json().get("flights", [])
            print(f"Search for '{fnum}' returned {len(found)} flights: {[f['flight_number'] for f in found]}")

        auth_res = await ac.post("/api/auth/login", json={"email": "manager@aeroflow.del", "password": "password123"})
        token = auth_res.json().get("token")
        auth_headers = {"Authorization": f"Bearer {token}"}

        admin_res = await ac.get("/api/admin/flights", headers=auth_headers)
        admin_flights = admin_res.json().get("flights", [])
        print(f"\nAdmin flights returned: {len(admin_flights)}")
        print("First 5 admin flights:")
        for f in admin_flights[:5]:
            print(f"  {f.get('flight_number')} | {f.get('std') or f.get('sta')} | {f.get('direction')}")

if __name__ == "__main__":
    asyncio.run(main())

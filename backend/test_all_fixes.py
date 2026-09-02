import asyncio
from httpx import AsyncClient, ASGITransport
from server import app
from database import db, now, iso
from auth import create_access_token

async def main():
    transport = ASGITransport(app=app)
    headers = {"User-Agent": "Mozilla/5.0"}
    async with AsyncClient(transport=transport, base_url="http://test", headers=headers) as ac:
        current_time = now()
        print("Backend NOW:", iso(current_time))

        b_res = await ac.get("/api/baggage/assignments")
        asgs = b_res.json().get("assignments", [])
        print(f"\nTotal baggage assignments today: {len(asgs)}")

        active_fnums = []
        for a in asgs[:5]:
            f = a.get("flight") or {}
            fnum = f.get("flight_number")
            cnum = a.get("carousel_number")
            ws = a.get("window_start")
            we = a.get("window_end")
            print(f"  Belt: {cnum:<6} | Flight: {fnum:<6} | Window: {ws} -> {we}")
            if fnum:
                active_fnums.append(fnum)

        for fnum in active_fnums[:3]:
            s_res = await ac.get(f"/api/flights/search?number={fnum}")
            found = s_res.json().get("flights", [])
            print(f"\nSearch for '{fnum}' in search bar -> Found {len(found)} results:")
            for f in found:
                print(f"    {f.get('flight_number')} | {f.get('direction')} | {f.get('origin')} -> {f.get('destination')} | STA: {f.get('sta')} | STD: {f.get('std')}")

        u = await db.users.find_one({"role": {"$in": ["admin", "ops_manager", "security_lead", "baggage_ops"]}})
        if not u:

            import bcrypt
            from bson import ObjectId
            hashed = bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode()
            res = await db.users.insert_one({"email": "admin@aeroflow.del", "hashed_password": hashed, "role": "admin", "full_name": "Admin"})
            u = await db.users.find_one({"_id": res.inserted_id})

        token = create_access_token(str(u["_id"]), u["email"], u["role"])
        admin_headers = {"Authorization": f"Bearer {token}"}

        adm_res = await ac.get("/api/admin/flights", headers=admin_headers)
        adm_flights = adm_res.json().get("flights", [])
        print(f"\nAdmin flights returned: {len(adm_flights)}")
        print("Top 6 flights in Flight Delay Manager:")
        for f in adm_flights[:6]:
            print(f"  {f.get('flight_number')} | {f.get('direction')} | STD: {f.get('std')} | STA: {f.get('sta')}")

if __name__ == "__main__":
    asyncio.run(main())

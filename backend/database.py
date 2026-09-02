import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
db_name = os.environ.get("DB_NAME", "aeroflow")

class DBProxy:
    def __init__(self):
        self._client = None
        self._db = None

    def _get_db(self):
        import asyncio
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if self._client is None or getattr(self._client, "_io_loop", None) != loop:
            self._client = AsyncIOMotorClient(mongo_url)
            self._db = self._client[db_name]
        return self._db

    def __getattr__(self, name):
        return getattr(self._get_db(), name)

    def __getitem__(self, name):
        return self._get_db()[name]

client = AsyncIOMotorClient(mongo_url)
db = DBProxy()

LOCAL_TZ = datetime.now().astimezone().tzinfo or timezone(timedelta(hours=5, minutes=30))

def now() -> datetime:
    return datetime.now(LOCAL_TZ)

def iso(dt: datetime) -> str:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=LOCAL_TZ)
    return dt.isoformat()

def parse_dt(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=LOCAL_TZ)
    try:
        dt = datetime.fromisoformat(value)
        return dt if dt.tzinfo else dt.replace(tzinfo=LOCAL_TZ)
    except Exception:
        return None

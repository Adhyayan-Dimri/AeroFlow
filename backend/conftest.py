import pytest
import os
from motor.motor_asyncio import AsyncIOMotorClient
import database

@pytest.fixture(autouse=True)
def reset_db_event_loop():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    database.client = AsyncIOMotorClient(mongo_url)
    database.db = database.client[os.environ.get("DB_NAME", "aeroflow")]

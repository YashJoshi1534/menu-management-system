from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "menu_management_system")

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

# Collections
contacts_collection = db["contacts"]
store_profiles_collection = db["store_profiles"]
requests_collection = db["requests"]
dishes_collection = db["dishes"]
categories_collection = db["categories"]

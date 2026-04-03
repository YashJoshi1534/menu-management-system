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
outlet_profiles_collection = db["outlet_profiles"]
requests_collection = db["requests"]
dishes_collection = db["dishes"]
categories_collection = db["categories"]
businesses_collection = db["businesses"]
otps_collection = db["otps"]
admin_config_collection = db["admin_config"]
business_types_collection = db["business_types"]
business_config_collection = db["business_configuration"]
scans_collection = db["scans"]


async def rename_legacy_collections():
    """Rename store_profiles → outlet_profiles if the old collection still exists."""
    try:
        existing = await db.list_collection_names()
        if "store_profiles" in existing and "outlet_profiles" not in existing:
            # The renameCollection command must be run against the 'admin' database.
            await client.admin.command("renameCollection",
                                f"{DB_NAME}.store_profiles",
                                to=f"{DB_NAME}.outlet_profiles")
            print("✅ Renamed MongoDB collection: store_profiles → outlet_profiles")
    except Exception as e:
        print(f"⚠️ Warning: Auto-migration failed: {str(e)}")

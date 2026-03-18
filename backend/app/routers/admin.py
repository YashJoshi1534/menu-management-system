from fastapi import APIRouter, HTTPException
from typing import List
from app.database import admin_config_collection, business_types_collection
from app.models import AdminConfigDB

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/config", response_model=AdminConfigDB)
async def get_admin_config():
    config = await admin_config_collection.find_one({}, {"_id": 0})
    if not config:
        # Return default config if none exists in DB
        return AdminConfigDB()
    return AdminConfigDB(**config)

@router.get("/business-types", response_model=List[str])
async def get_business_types():
    cursor = business_types_collection.find({}, {"_id": 0, "name": 1})
    types = await cursor.to_list(length=100)
    if not types:
        # Return default types if collection is empty
        return ["Restaurant", "Cafe", "Bar", "Hotel", "Other"]
    return [t["name"] for t in types]

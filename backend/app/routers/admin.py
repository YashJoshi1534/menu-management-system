from fastapi import APIRouter, HTTPException
from typing import List
from app.database import admin_config_collection, business_types_collection, business_config_collection
from app.models import AdminConfigDB, BusinessConfigDB, BusinessConfigUpdate

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/config", response_model=AdminConfigDB)
async def get_admin_config():
    config = await admin_config_collection.find_one({}, {"_id": 0})
    if not config:
        # Return default config if none exists in DB
        return AdminConfigDB()
    return AdminConfigDB(**config)

@router.post("/config", response_model=AdminConfigDB)
async def update_admin_config(config: AdminConfigDB):
    config_dict = config.dict()
    await admin_config_collection.update_one({}, {"$set": config_dict}, upsert=True)
    return config

@router.get("/business-configs", response_model=List[BusinessConfigDB])
async def get_all_business_configs():
    cursor = business_config_collection.find({}, {"_id": 0})
    return await cursor.to_list(length=1000)

@router.get("/business-config/{business_id}", response_model=BusinessConfigDB)
async def get_business_config(business_id: str):
    config = await business_config_collection.find_one({"businessId": business_id}, {"_id": 0})
    if not config:
        # Fallback to general admin config if not specifically set
        admin_config = await admin_config_collection.find_one({}, {"_id": 0})
        if not admin_config:
            admin_config = AdminConfigDB().dict()
        return BusinessConfigDB(**admin_config, businessId=business_id)
    return BusinessConfigDB(**config)

@router.put("/business-config/{business_id}", response_model=BusinessConfigDB)
async def update_business_config(business_id: str, update: BusinessConfigUpdate):
    update_dict = update.dict(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    await business_config_collection.update_one(
        {"businessId": business_id},
        {"$set": update_dict},
        upsert=True
    )
    
    updated_config = await business_config_collection.find_one({"businessId": business_id}, {"_id": 0})
    return BusinessConfigDB(**updated_config)

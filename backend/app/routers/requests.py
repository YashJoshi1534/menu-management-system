from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
from app.database import requests_collection, dishes_collection, store_profiles_collection, categories_collection
from app.models import RequestDB, DishDB, CategoryDB
from app.services.gemini_service import extract_menu_data
from app.logger import get_logger
import uuid

logger = get_logger(__name__)
import os
import shutil

router = APIRouter(tags=["Requests"])

@router.post("/stores/{store_uid}/requests", response_model=dict)
async def create_request(store_uid: str):
    # Verify store exists
    store = await store_profiles_collection.find_one({"storeUid": store_uid})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    request_id = f"req_{uuid.uuid4().hex[:8]}"
    
    new_request = RequestDB(
        requestId=request_id,
        storeUid=store_uid,
        currentStep=1,
        status="in_progress"
    )

    await requests_collection.insert_one(new_request.dict())

    return {"requestId": request_id, "currentStep": 1}

@router.post("/requests/{request_id}/menu-images")
async def upload_menu_images(request_id: str, images: List[UploadFile] = File(...)):
    # Verify request
    req = await requests_collection.find_one({"requestId": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    UPLOAD_DIR = f"uploads/{request_id}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    extracted_dishes = []
    
    for idx, img in enumerate(images):
        logger.info(f"Processing image {idx+1}/{len(images)}: {img.filename}")
        file_path = os.path.join(UPLOAD_DIR, img.filename)
        with open(file_path, "wb") as f:
            f.write(await img.read())

        # Call Gemini
        data = await extract_menu_data(file_path)
        
        if data and "categories" in data:
            for cat in data["categories"]:
                cat_name = cat.get("name", "General")
                cat_id = f"cat_{uuid.uuid4().hex[:8]}"
                
                # Create Category
                new_cat = CategoryDB(
                    categoryId=cat_id,
                    storeUid=req["storeUid"],
                    requestId=request_id,
                    name=cat_name
                )
                await categories_collection.insert_one(new_cat.dict())

                # Create Dishes in this Category
                for item in cat.get("items", []):
                    dish_id = f"dish_{uuid.uuid4().hex[:8]}"
                    
                    # Sanitize price
                    price_val = item.get("price")
                    if isinstance(price_val, str):
                       try:
                           price_val = float(price_val.replace("$", "").replace(",", "")) 
                       except:
                           price_val = 0.0

                    new_dish = DishDB(
                        dishId=dish_id,
                        requestId=request_id,
                        storeUid=req["storeUid"],
                        categoryId=cat_id, # Link to Category
                        name=item.get("name", "Unknown Dish"),
                        price=price_val,
                        weight=item.get("weight"),       # New Field
                        description=item.get("description"), # New Field
                        imageIndex=idx
                    )
                    
                    extracted_dishes.append(new_dish.dict())

    if extracted_dishes:
        await dishes_collection.insert_many(extracted_dishes)

    # Update Request Step
    await requests_collection.update_one(
        {"requestId": request_id},
        {"$set": {"currentStep": 2}}
    )

    return {"currentStep": 2, "totalDishes": len(extracted_dishes)}

@router.get("/stores/{store_uid}/requests/active", response_model=dict)
async def get_active_request(store_uid: str):
    req = await requests_collection.find_one(
        {"storeUid": store_uid, "status": "in_progress"},
        sort=[("createdAt", -1)]
    )
    if not req:
        raise HTTPException(status_code=404, detail="No active request found")
        
    return {"requestId": req["requestId"], "currentStep": req["currentStep"]}

@router.post("/requests/{request_id}/publish", response_model=dict)
async def publish_request(request_id: str):
    req = await requests_collection.find_one({"requestId": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    store_uid = req["storeUid"]
    
    # Optional logic: mark old published categories and dishes of this store as False (or delete)
    # We will delete the previous live menu entirely for a clean slate, to handle edge cases
    from app.database import categories_collection, dishes_collection
    
    # 1. Archive/Delete old published ones (For safety let's just delete them entirely for this store)
    await categories_collection.delete_many({"storeUid": store_uid, "isPublished": True, "requestId": {"$ne": request_id}})
    await dishes_collection.delete_many({"storeUid": store_uid, "isPublished": True, "requestId": {"$ne": request_id}})
    
    # 2. Publish new ones
    await categories_collection.update_many(
        {"requestId": request_id},
        {"$set": {"isPublished": True}}
    )
    await dishes_collection.update_many(
        {"requestId": request_id},
        {"$set": {"isPublished": True}}
    )
    
    # 3. Mark request as completed
    await requests_collection.update_one(
        {"requestId": request_id},
        {"$set": {"status": "completed", "currentStep": 4}}
    )
    
    return {"status": "success", "message": "Menu successfully generated and published"}

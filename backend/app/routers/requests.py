from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
from app.database import requests_collection, dishes_collection, outlet_profiles_collection, categories_collection, admin_config_collection, business_config_collection
from app.models import RequestDB, DishDB, CategoryDB, AdminConfigDB
from app.services.gemini_service import extract_menu_data
from app.services.cloudinary_service import upload_image
from app.logger import get_logger
import uuid

logger = get_logger(__name__)
import os
import shutil

router = APIRouter(tags=["Requests"])

@router.post("/outlets/{store_uid}/requests", response_model=dict)
async def create_request(store_uid: str):
    # Verify outlet exists
    store = await outlet_profiles_collection.find_one({"storeUid": store_uid})
    if not store:
        raise HTTPException(status_code=404, detail="Outlet not found")

    # Fetch configuration
    business_id = store.get("contactId")
    config_dict = await business_config_collection.find_one({"businessId": business_id})
    if not config_dict:
        config_dict = await admin_config_collection.find_one({})
        if not config_dict:
            config_dict = AdminConfigDB().dict()
    config = AdminConfigDB(**config_dict)
    
    # Check concurrent process limit for this store
    active_requests_count = await requests_collection.count_documents({
        "storeUid": store_uid, 
        "status": "in_progress"
    })
    
    if active_requests_count >= config.processCreationLimit:
        raise HTTPException(
            status_code=403, 
            detail=f"Maximum limit of {config.processCreationLimit} active menu generation processes reached for this outlet."
        )

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

    # Fetch configuration
    store = await outlet_profiles_collection.find_one({"storeUid": req["storeUid"]})
    business_id = store.get("contactId")
    config_dict = await business_config_collection.find_one({"businessId": business_id})
    if not config_dict:
        config_dict = await admin_config_collection.find_one({})
        if not config_dict:
            config_dict = AdminConfigDB().dict()
    config = AdminConfigDB(**config_dict)
    
    if len(images) > config.maxImagesPerUpload:
        raise HTTPException(
            status_code=400, 
            detail=f"Maximum {config.maxImagesPerUpload} images allowed per upload."
        )

    extracted_dishes = []
    
    for idx, img in enumerate(images):
        logger.info(f"Processing image {idx+1}/{len(images)}: {img.filename}")
        img_bytes = await img.read()
        
        # Upload to Cloudinary
        folder_path = f"requests/{request_id}/menu_images"
        public_id = f"img_{uuid.uuid4().hex[:8]}"
        cloudinary_url = upload_image(img_bytes, folder=folder_path, public_id=public_id)

        # Call Gemini
        data = await extract_menu_data(img_bytes)
        
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
                    parent_dish_id = f"dish_{uuid.uuid4().hex[:8]}"
                    
                    # Sanitize price helper
                    def sanitize_price(p):
                        if isinstance(p, str):
                            try:
                                return float(p.replace("$", "").replace(",", "")) 
                            except:
                                return 0.0
                        return float(p) if p is not None else 0.0

                    base_price = sanitize_price(item.get("price"))
                    
                    # Prepare Variants & Addons
                    extracted_variants = []
                    for var in item.get("variants", []):
                        extracted_variants.append({
                            "variantType": var.get("variantType"),
                            "label": var.get("label", "Variant"),
                            "price": sanitize_price(var.get("price"))
                        })

                    extracted_addons = []
                    for ad in item.get("addons", []):
                        extracted_addons.append({
                            "name": ad.get("name", "Extra"),
                            "price": sanitize_price(ad.get("price"))
                        })

                    # Create Parent Dish
                    new_dish = DishDB(
                        dishId=parent_dish_id,
                        requestId=request_id,
                        storeUid=req["storeUid"],
                        categoryId=cat_id,
                        name=item.get("name", "Unknown Dish"),
                        price=base_price,
                        weight=item.get("weight"),
                        description=item.get("description"),
                        imageUrl=None, 
                        imageStatus="pending",
                        imageIndex=idx,
                        variants=extracted_variants,
                        addons=extracted_addons
                    )
                    extracted_dishes.append(new_dish.dict())

    if extracted_dishes:
        await dishes_collection.insert_many(extracted_dishes)

    # Update Request Step
    await requests_collection.update_one(
        {"requestId": request_id},
        {"$set": {"currentStep": 3}}
    )

    return {"currentStep": 3, "totalDishes": len(extracted_dishes)}

@router.get("/outlets/{store_uid}/requests/active", response_model=dict)
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

@router.delete("/requests/{request_id}", response_model=dict)
async def delete_request(request_id: str):
    logger.info(f"Soft deleting request {request_id}")
    
    # 1. Verify existence
    req = await requests_collection.find_one({"requestId": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # 2. Mark request as cancelled (Soft Delete)
    await requests_collection.update_one(
        {"requestId": request_id},
        {"$set": {"status": "cancelled", "currentStep": 0}}
    )
    
    # 3. Hard delete associated dishes/categories (to keep UI clean)
    await dishes_collection.delete_many({"requestId": request_id})
    await categories_collection.delete_many({"requestId": request_id})
    
    return {"status": "success", "message": f"Process {request_id} cancelled and cleaned up"}

from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Body
from typing import Optional
from app.database import dishes_collection, requests_collection
from app.services.stability_service import generate_image_stability
from app.services.cloudinary_service import upload_image
from app.models import DishPaginationResponse, DishDB
from app.logger import get_logger
import math

logger = get_logger(__name__)
import asyncio
import uuid
from datetime import datetime

router = APIRouter(tags=["Dishes"])

@router.get("/requests/{request_id}/dishes", response_model=DishPaginationResponse)
async def get_dishes(
    request_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1)
):
    skip = (page - 1) * limit
    
    query = {"requestId": request_id, "isDeleted": {"$ne": True}}
    total_count = await dishes_collection.count_documents(query)
    cursor = dishes_collection.find(query).skip(skip).limit(limit)
    
    dishes = await cursor.to_list(length=limit)
    
    dish_obj = dishes[0] if dishes else None
    
    # Fetch Category Name
    category_name = "General"
    if dish_obj and dish_obj.get("categoryId"):
        from app.database import categories_collection
        cat = await categories_collection.find_one({"categoryId": dish_obj["categoryId"]})
        if cat:
            category_name = cat.get("name", "General")

    from app.database import admin_config_collection, outlet_profiles_collection
    config = await admin_config_collection.find_one() or {}
    gen_limit = config.get("imageGenerationLimitPerDish", 1)

    req = await requests_collection.find_one({"requestId": request_id})
    outlet_currency = "₹"
    if req:
        store = await outlet_profiles_collection.find_one({"storeUid": req.get("storeUid")})
        if store:
            outlet_currency = store.get("currency", "₹")

    if dish_obj:
        dish_obj["categoryName"] = category_name

    return {
        "page": page,
        "totalPages": math.ceil(total_count / limit) if limit > 0 else 0,
        "dish": dish_obj,
        "generationLimit": gen_limit,
        "outletCurrency": outlet_currency
    }

@router.post("/requests/{request_id}/generate-image/{dish_id}")
async def generate_dish_image_route(request_id: str, dish_id: str):
    dish = await dishes_collection.find_one({"dishId": dish_id, "requestId": request_id})
    if not dish:
        raise HTTPException(status_code=404, detail="Dish not found")

    from app.database import admin_config_collection
    config = await admin_config_collection.find_one() or {}
    limit = config.get("imageGenerationLimitPerDish", 1)

    if dish.get("generationCount", 0) >= limit:
        raise HTTPException(status_code=400, detail="Generation limit reached for this dish")

    # Update status to generating
    await dishes_collection.update_one(
        {"dishId": dish_id},
        {"$set": {"imageStatus": "generating"}}
    )

    try:
        # Generate Image
        prompt = f"Professional high quality food photography of {dish['name']}, restaurant style, 4k, delicious"
        image_bytes = generate_image_stability(prompt)

        if not image_bytes:
            raise Exception("No image generated")

        # Upload to Cloudinary
        image_url = upload_image(image_bytes, "generated_dishes", f"{dish_id}_gen")

        # Update DB
        await dishes_collection.update_one(
            {"dishId": dish_id},
            {"$set": {
                "imageUrl": image_url, 
                "imageStatus": "ready"
            }, "$inc": {"generationCount": 1}}
        )
        
        # Check if ALL dishes are ready to update Request status?
        # (Optional optimization, or handled by separate check)
        
        return {"imageUrl": image_url, "imageStatus": "ready"}

    except Exception as e:
        logger.error(f"CRITICAL ERROR in generate_dish_image_route: {str(e)}") # <--- ADDED LOG
        await dishes_collection.update_one(
            {"dishId": dish_id},
            {"$set": {"imageStatus": "failed"}}
        )
        raise HTTPException(status_code=500, detail=str(e))
@router.put("/dishes/{dish_id}")
async def update_dish(dish_id: str, update_data: dict = Body(...)):
    # Determine what fields to update
    # Expected keys: name, price, weight, description
    
    update_fields = {"updatedAt": datetime.utcnow()}
    if "name" in update_data:
        update_fields["name"] = update_data["name"]
    if "price" in update_data:
        try:
            val = update_data["price"]
            update_fields["price"] = float(val) if val not in [None, ""] else 0.0
        except (ValueError, TypeError):
            pass # Ignore invalid price
    if "weight" in update_data:
        update_fields["weight"] = update_data["weight"]
    if "description" in update_data:
        update_fields["description"] = update_data["description"]
    if "isPublished" in update_data:
        update_fields["isPublished"] = bool(update_data["isPublished"])
    
    # New Fields
    if "variants" in update_data:
        update_fields["variants"] = update_data["variants"]
    if "addons" in update_data:
        # Expected List[dict(name, price)]
        update_fields["addons"] = update_data["addons"]
    
    if "categoryName" in update_data:
        # Find or create category for this store
        dish = await dishes_collection.find_one({"dishId": dish_id})
        if dish:
            store_uid = dish.get("storeUid")
            cat_name = update_data["categoryName"]
            from app.database import categories_collection
            
            cat = await categories_collection.find_one({"storeUid": store_uid, "name": cat_name, "isDeleted": {"$ne": True}})
            if not cat:
                cat_id = f"cat_{(uuid.uuid4().hex)[:8]}"
                await categories_collection.insert_one({
                    "categoryId": cat_id,
                    "storeUid": store_uid,
                    "requestId": dish.get("requestId", "manual"),
                    "name": cat_name,
                    "isPublished": True,
                    "createdAt": datetime.utcnow(),
                    "updatedAt": datetime.utcnow()
                })
            else:
                cat_id = cat["categoryId"]
            update_fields["categoryId"] = cat_id
            update_fields["categoryName"] = cat_name
        
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")
        
    result = await dishes_collection.update_one(
        {"dishId": dish_id},
        {"$set": update_fields}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dish not found")
        
    # Return the full updated document to allow perfect frontend sync
    updated_dish = await dishes_collection.find_one({"dishId": dish_id}, {"_id": 0})
    return updated_dish


@router.post("/outlets/{outlet_uid}/dishes", response_model=DishDB)
async def create_manual_dish(outlet_uid: str, dish_data: dict = Body(...)):
    # dish_data expected: name, price, weight, description, categoryId
    
    dish_id = f"dish_{uuid.uuid4().hex[:8]}"
    
    new_dish = {
        "dishId": dish_id,
        "storeUid": outlet_uid,
        "requestId": "manual",
        "categoryId": dish_data.get("categoryId"),
        "name": dish_data.get("name", "New Dish"),
        "price": float(dish_data.get("price", 0)) if dish_data.get("price") else 0.0,
        "weight": dish_data.get("weight"),
        "description": dish_data.get("description"),
        "imageStatus": "pending",
        "imageIndex": 0,
        "isPublished": True,
        "variants": dish_data.get("variants", []),
        "addons": dish_data.get("addons", []),
        "createdAt": datetime.utcnow()
    }
    
    await dishes_collection.insert_one(new_dish)
    return new_dish

@router.post("/dishes/{dish_id}/upload-image")
async def upload_dish_image_manual(dish_id: str, file: UploadFile = File(...)):
    dish = await dishes_collection.find_one({"dishId": dish_id})
    if not dish:
        raise HTTPException(status_code=404, detail="Dish not found")

    try:
        content = await file.read()
        # Upload to Cloudinary
        image_url = upload_image(content, "manual_dishes", f"{dish_id}_manual")
        
        # Update DB
        await dishes_collection.update_one(
            {"dishId": dish_id},
            {"$set": {
                "imageUrl": image_url, 
                "imageStatus": "ready"
            }}
        )
        return {"imageUrl": image_url, "imageStatus": "ready"}
    except Exception as e:
        logger.error(f"Error in upload_dish_image_manual: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/dishes/{dish_id}")
async def delete_dish(dish_id: str):
    result = await dishes_collection.update_one(
        {"dishId": dish_id},
        {"$set": {"isDeleted": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dish not found")
    return {"status": "deleted"}

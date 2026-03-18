from fastapi import APIRouter, Form, UploadFile, File, HTTPException, status
from typing import List, Optional
from app.database import businesses_collection, store_profiles_collection
from app.services.cloudinary_service import upload_image
from app.models import StoreDB, StoreUpdate
import uuid
from datetime import datetime
import shutil

router = APIRouter(tags=["Stores"])

@router.post("/businesses/{business_id}/stores", response_model=dict)
async def create_store(
    business_id: str,
    storeName: str = Form(...),
    address: str = Form(...),
    city: str = Form(...),
    zipCode: str = Form(...),
    currency: str = Form("₹"),
    logo: Optional[UploadFile] = File(None),
    store_images: Optional[List[UploadFile]] = File(None)
):
    # Validate business
    business = await businesses_collection.find_one({"businessId": business_id})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    store_uid = f"store_{uuid.uuid4().hex[:8]}"

    # Upload Logo if provided
    logo_url = None
    if logo:
        try:
            content = await logo.read()
            logo_url = upload_image(content, "store_logos", f"{store_uid}_logo")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Logo upload failed: {str(e)}")

    # Upload Store Images if provided
    store_image_urls = []
    if store_images:
        for i, img in enumerate(store_images):
            try:
                content = await img.read()
                url = upload_image(content, "store_photos", f"{store_uid}_photo_{i}")
                store_image_urls.append(url)
            except Exception as e:
                print(f"Failed to upload store image {i}: {e}")

    new_store = StoreDB(
        storeUid=store_uid,
        contactId=business_id, # Keeping contactId field name in DB for compatibility, but storing business_id
        storeName=storeName,
        address=address,
        city=city,
        zipCode=zipCode,
        logoUrl=logo_url,
        storeImages=store_image_urls,
        currency=currency
    )

    # Save Store
    await store_profiles_collection.insert_one(new_store.dict())

    # Update Business
    await businesses_collection.update_one(
        {"businessId": business_id},
        {"$push": {"storeUids": store_uid}}
    )

    return {"storeUid": store_uid}

@router.get("/businesses/{business_id}/stores")
async def get_business_stores(business_id: str, search: Optional[str] = None):
    query = {"contactId": business_id, "isDeleted": {"$ne": True}}
    if search:
        query["storeName"] = {"$regex": search, "$options": "i"}
    cursor = store_profiles_collection.find(query, {"_id": 0})
    stores = []
    async for store in cursor:
        stores.append(store)
    return stores

@router.put("/stores/{store_uid}")
async def update_store(store_uid: str, store_data: StoreUpdate):
    update_data = store_data.dict(exclude_unset=True)
    if not update_data:
        return {"status": "no_changes"}
    update_data["updatedAt"] = datetime.utcnow()
    
    result = await store_profiles_collection.update_one(
        {"storeUid": store_uid},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Store not found")
    return {"status": "success"}

@router.put("/stores/{store_uid}/logo")
async def update_store_logo(store_uid: str, logo: UploadFile = File(...)):
    store = await store_profiles_collection.find_one({"storeUid": store_uid})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    try:
        content = await logo.read()
        logo_url = upload_image(content, "store_logos", f"{store_uid}_logo")
        await store_profiles_collection.update_one(
            {"storeUid": store_uid}, 
            {"$set": {"logoUrl": logo_url, "updatedAt": datetime.utcnow()}}
        )
        return {"logoUrl": logo_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Logo upload failed: {str(e)}")

@router.delete("/stores/{store_uid}")
async def delete_store(store_uid: str):
    result = await store_profiles_collection.update_one(
        {"storeUid": store_uid},
        {"$set": {"isDeleted": True, "updatedAt": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Store not found")
    return {"status": "deleted"}

@router.get("/stores/{store_uid}/menu")
async def get_store_menu(store_uid: str):
    store = await store_profiles_collection.find_one({"storeUid": store_uid}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    # Get Categories
    from app.database import categories_collection, dishes_collection
    categories = await categories_collection.find({"storeUid": store_uid, "isPublished": True}, {"_id": 0}).to_list(length=100)
    
    # Get Dishes
    dishes = await dishes_collection.find({"storeUid": store_uid, "isPublished": True}, {"_id": 0}).to_list(length=1000)
    
    # Group dishes by category
    menu_data = []
    
    # 1. Process defined categories
    for cat in categories:
        cat_dishes = [d for d in dishes if d.get("categoryId") == cat["categoryId"]]
        menu_data.append({
            "categoryName": cat["name"],
            "dishes": cat_dishes
        })
        
    # 2. Process uncategorized dishes
    uncategorized = [d for d in dishes if not d.get("categoryId")]
    if uncategorized:
        menu_data.append({
            "categoryName": "General",
            "dishes": uncategorized
        })
        
    from app.database import admin_config_collection
    config = await admin_config_collection.find_one() or {}
    gen_limit = config.get("imageGenerationLimitPerDish", 1)

    return {
        "store": store,
        "menu": menu_data,
        "generationLimit": gen_limit
    }

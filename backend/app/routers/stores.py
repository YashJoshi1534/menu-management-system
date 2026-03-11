from fastapi import APIRouter, Form, UploadFile, File, HTTPException, status
from app.database import businesses_collection, store_profiles_collection
from app.services.cloudinary_service import upload_image
from app.models import StoreDB
import uuid
from datetime import datetime
import shutil

router = APIRouter(tags=["Stores"])

@router.post("/businesses/{business_id}/stores", response_model=dict)
async def create_store(
    business_id: str,
    storeName: str = Form(...),
    logo: UploadFile = File(...)
):
    # Validate business
    business = await businesses_collection.find_one({"businessId": business_id})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    store_uid = f"store_{uuid.uuid4().hex[:8]}"

    # Upload Logo
    try:
        content = await logo.read()
        logo_url = upload_image(content, "store_logos", f"{store_uid}_logo")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Logo upload failed: {str(e)}")

    new_store = StoreDB(
        storeUid=store_uid,
        contactId=business_id, # Keeping contactId field name in DB for compatibility, but storing business_id
        storeName=storeName,
        logoUrl=logo_url
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
async def get_business_stores(business_id: str):
    cursor = store_profiles_collection.find({"contactId": business_id}, {"_id": 0})
    stores = []
    async for store in cursor:
        stores.append(store)
    return stores

@router.get("/stores/{store_uid}/menu")
async def get_store_menu(store_uid: str):
    store = await store_profiles_collection.find_one({"storeUid": store_uid}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    # Get Categories
    from app.database import categories_collection, dishes_collection
    categories = await categories_collection.find({"storeUid": store_uid}, {"_id": 0}).to_list(length=100)
    
    # Get Dishes
    dishes = await dishes_collection.find({"storeUid": store_uid}, {"_id": 0}).to_list(length=1000)
    
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
        
    return {
        "store": store,
        "menu": menu_data
    }

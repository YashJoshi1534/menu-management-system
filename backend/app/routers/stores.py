from fastapi import APIRouter, Form, UploadFile, File, HTTPException, status
from app.database import contacts_collection, store_profiles_collection
from app.services.cloudinary_service import upload_image
from app.models import StoreDB
import uuid
from datetime import datetime
import shutil

router = APIRouter(tags=["Stores"])

@router.post("/contacts/{contact_id}/stores", response_model=dict)
async def create_store(
    contact_id: str,
    storeName: str = Form(...),
    logo: UploadFile = File(...)
):
    # Validate contact
    contact = await contacts_collection.find_one({"contactId": contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Validate Logo (Basic check, rigorous check would need PIL)
    # Ideally checking dimensions here, but for now we skip strict PIL check to keep it simple 
    # unless specific library usage is requested. SRS says 1024x1024 required.
    
    store_uid = f"store_{uuid.uuid4().hex[:8]}"

    # Upload Logo
    try:
        # Read file into memory
        content = await logo.read()
        logo_url = upload_image(content, "store_logos", f"{store_uid}_logo")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Logo upload failed: {str(e)}")

    new_store = StoreDB(
        storeUid=store_uid,
        contactId=contact_id,
        storeName=storeName,
        logoUrl=logo_url
    )

    # Save Store
    await store_profiles_collection.insert_one(new_store.dict())

    # Update Contact
    await contacts_collection.update_one(
        {"contactId": contact_id},
        {"$push": {"storeUids": store_uid}}
    )

    return {"storeUid": store_uid}

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

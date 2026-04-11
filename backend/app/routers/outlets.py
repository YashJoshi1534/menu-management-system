from fastapi import APIRouter, Form, UploadFile, File, HTTPException, status, Query
from typing import List, Optional
from app.database import businesses_collection, outlet_profiles_collection, scans_collection, admin_config_collection, business_config_collection
from app.services.cloudinary_service import upload_image
from app.models import OutletDB, OutletUpdate, AdminConfigDB
import uuid
from datetime import datetime
import shutil

router = APIRouter(tags=["Outlets"])

@router.post("/businesses/{business_id}/outlets", response_model=dict)
async def create_outlet(
    business_id: str,
    storeName: str = Form(...),
    address: str = Form(...),
    city: str = Form(...),
    zipCode: str = Form(...),
    currency: str = Form("₹"),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    logo: Optional[UploadFile] = File(None),
    store_images: Optional[List[UploadFile]] = File(None)
):
    # Validate business
    business = await businesses_collection.find_one({"businessId": business_id})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    # Check processCreationLimit
    config_dict = await business_config_collection.find_one({"businessId": business_id})
    if not config_dict:
        config_dict = await admin_config_collection.find_one({})
        if not config_dict:
            config_dict = AdminConfigDB().dict()
    
    config = AdminConfigDB(**config_dict)
    
    existing_outlets_count = await outlet_profiles_collection.count_documents({
        "contactId": business_id, 
        "isDeleted": {"$ne": True}
    })
    
    if existing_outlets_count >= config.processCreationLimit:
        raise HTTPException(
            status_code=403, 
            detail=f"Maximum limit of {config.processCreationLimit} outlets reached for your business."
        )

    outlet_uid = f"store_{uuid.uuid4().hex[:8]}"  # prefix kept for existing data compat

    # Upload Logo if provided
    logo_url = None
    if logo:
        try:
            content = await logo.read()
            logo_url = upload_image(content, "store_logos", f"{outlet_uid}_logo")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Logo upload failed: {str(e)}")

    # Upload Outlet Images if provided
    store_image_urls = []
    if store_images:
        for i, img in enumerate(store_images):
            try:
                content = await img.read()
                url = upload_image(content, "store_photos", f"{outlet_uid}_photo_{i}")
                store_image_urls.append(url)
            except Exception as e:
                print(f"Failed to upload outlet image {i}: {e}")

    new_outlet = OutletDB(
        storeUid=outlet_uid,
        contactId=business_id,
        storeName=storeName,
        address=address,
        city=city,
        zipCode=zipCode,
        logoUrl=logo_url,
        storeImages=store_image_urls,
        currency=currency,
        latitude=latitude,
        longitude=longitude
    )

    # Save Outlet
    await outlet_profiles_collection.insert_one(new_outlet.dict())

    # Update Business
    await businesses_collection.update_one(
        {"businessId": business_id},
        {"$push": {"storeUids": outlet_uid}}
    )

    return {"storeUid": outlet_uid}


@router.get("/businesses/{business_id}/outlets")
async def get_business_outlets(
    business_id: str, 
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 10
):
    query = {"contactId": business_id, "isDeleted": {"$ne": True}}
    if search:
        query["storeName"] = {"$regex": search, "$options": "i"}
    
    total = await outlet_profiles_collection.count_documents(query)
    skip = (page - 1) * limit
    
    cursor = outlet_profiles_collection.find(query, {"_id": 0}).sort("createdAt", -1).skip(skip).limit(limit)
    outlets = []
    async for outlet in cursor:
        outlets.append(outlet)
        
    return {
        "outlets": outlets,
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": (total + limit - 1) // limit
    }


@router.put("/outlets/{outlet_uid}")
async def update_outlet(outlet_uid: str, outlet_data: OutletUpdate):
    update_data = outlet_data.dict(exclude_unset=True)
    if not update_data:
        return {"status": "no_changes"}
    update_data["updatedAt"] = datetime.utcnow()

    result = await outlet_profiles_collection.update_one(
        {"storeUid": outlet_uid},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Outlet not found")
    return {"status": "success"}


@router.put("/outlets/{outlet_uid}/logo")
async def update_outlet_logo(outlet_uid: str, logo: UploadFile = File(...)):
    outlet = await outlet_profiles_collection.find_one({"storeUid": outlet_uid})
    if not outlet:
        raise HTTPException(status_code=404, detail="Outlet not found")

    try:
        content = await logo.read()
        logo_url = upload_image(content, "store_logos", f"{outlet_uid}_logo")
        await outlet_profiles_collection.update_one(
            {"storeUid": outlet_uid},
            {"$set": {"logoUrl": logo_url, "updatedAt": datetime.utcnow()}}
        )
        return {"logoUrl": logo_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Logo upload failed: {str(e)}")


@router.delete("/outlets/{outlet_uid}")
async def delete_outlet(outlet_uid: str):
    result = await outlet_profiles_collection.update_one(
        {"storeUid": outlet_uid},
        {"$set": {"isDeleted": True, "updatedAt": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Outlet not found")
    return {"status": "deleted"}


@router.get("/outlets/{outlet_uid}/menu")
async def get_outlet_menu(outlet_uid: str):
    outlet = await outlet_profiles_collection.find_one({"storeUid": outlet_uid}, {"_id": 0})
    if not outlet:
        raise HTTPException(status_code=404, detail="Outlet not found")

    # Get Categories
    from app.database import categories_collection, dishes_collection
    categories = await categories_collection.find({"storeUid": outlet_uid, "isPublished": True}, {"_id": 0}).to_list(length=100)

    # Get Dishes
    dishes = await dishes_collection.find({"storeUid": outlet_uid, "isPublished": True}, {"_id": 0}).to_list(length=1000)

    # Group dishes by category
    menu_data = []

    # 1. Process defined categories
    for cat in categories:
        cat_dishes = [d for d in dishes if d.get("categoryId") == cat["categoryId"]]
        menu_data.append({
            "categoryId": cat["categoryId"],
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
        "outlet": outlet,
        "menu": menu_data,
        "generationLimit": gen_limit
    }


@router.get("/outlets/{outlet_uid}/categories")
async def get_outlet_categories(
    outlet_uid: str,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1)
):
    from app.database import categories_collection, dishes_collection
    
    query = {"storeUid": outlet_uid, "isPublished": True, "isDeleted": {"$ne": True}}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
        
    total = await categories_collection.count_documents(query)
    skip = (page-1) * limit
    
    cursor = categories_collection.find(query, {"_id": 0}).sort("createdAt", -1).skip(skip).limit(limit)
    categories = []
    async for cat in cursor:
        dish_count = await dishes_collection.count_documents({"categoryId": cat["categoryId"], "isDeleted": {"$ne": True}})
        cat["dishCount"] = dish_count
        categories.append(cat)
        
    return {
        "categories": categories,
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": (total + limit - 1) // limit if limit > 0 else 0
    }


@router.post("/outlets/{outlet_uid}/categories")
async def create_outlet_category(outlet_uid: str, name: str, isPublished: bool = True):
    from app.database import categories_collection
    category_id = f"cat_{(uuid.uuid4().hex)[:8]}"
    
    new_cat = {
        "categoryId": category_id,
        "storeUid": outlet_uid,
        "requestId": "manual",
        "name": name,
        "isPublished": isPublished,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    await categories_collection.insert_one(new_cat)
    return {"categoryId": category_id, "name": name, "isPublished": isPublished}


@router.get("/outlets/{outlet_uid}/dishes")
async def get_outlet_dishes(
    outlet_uid: str,
    categoryId: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1)
):
    from app.database import dishes_collection
    import logging
    logger = logging.getLogger("uvicorn")
    
    logger.info(f"FETCH DISHES: outlet={outlet_uid}, cat={categoryId}, page={page}, limit={limit}")
    
    query = {"storeUid": outlet_uid, "isDeleted": {"$ne": True}}
    if categoryId:
        query["categoryId"] = categoryId
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
        
    total = await dishes_collection.count_documents(query)
    skip = (int(page) - 1) * int(limit)
    
    logger.info(f"QUERY EXEC: total={total}, skip={skip}, limit={limit}")
    
    cursor = dishes_collection.find(query, {"_id": 0}).sort("createdAt", -1).skip(skip).limit(limit)
    dishes = await cursor.to_list(length=limit)
    
    logger.info(f"RESULTS: count={len(dishes)}")
    
    return {
        "dishes": dishes,
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": (total + limit - 1) // limit if limit > 0 else 0
    }


@router.post("/outlets/{outlet_uid}/scan")
async def record_scan(outlet_uid: str):
    await scans_collection.insert_one({
        "outletUid": outlet_uid,
        "timestamp": datetime.utcnow()
    })
    
    # Increment persistent scan counter on outlet profile
    await outlet_profiles_collection.update_one(
        {"storeUid": outlet_uid},
        {"$inc": {"qrScanCount": 1}}
    )
    
    return {"status": "recorded"}


@router.get("/outlets/{outlet_uid}/analytics")
async def get_outlet_analytics(outlet_uid: str):
    from datetime import timedelta
    
    # Get last 7 days
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7)
    
    pipeline = [
        {"$match": {
            "outletUid": outlet_uid,
            "timestamp": {"$gte": start_date}
        }},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    cursor = scans_collection.aggregate(pipeline)
    results = await cursor.to_list(length=100)
    
    # Fill in zeros for days with no scans
    analytics_data = []
    day_map = {r["_id"]: r["count"] for r in results}
    
    for i in range(8):
        current_day = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        analytics_data.append({
            "date": current_day,
            "count": day_map.get(current_day, 0)
        })
        
    return analytics_data


@router.get("/businesses/{business_id}/stats")
async def get_business_stats(business_id: str):
    from app.database import outlet_profiles_collection, categories_collection, dishes_collection
    
    # Check business exists
    business = await businesses_collection.find_one({"businessId": business_id})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    # 1. Total Outlets (Active only)
    total_outlets = await outlet_profiles_collection.count_documents({
        "contactId": business_id, 
        "isDeleted": {"$ne": True},
        "isActive": True
    })
    
    # 2. Get all outlet UIDs for this business to filter categories/dishes
    outlet_cursor = outlet_profiles_collection.find({
        "contactId": business_id, 
        "isDeleted": {"$ne": True},
        "isActive": True
    }, {"storeUid": 1})
    outlet_uids = [o["storeUid"] async for o in outlet_cursor]
    
    # 3. Total Categories
    total_categories = await categories_collection.count_documents({"storeUid": {"$in": outlet_uids}, "isDeleted": {"$ne": True}})
    
    # 4. Total Dishes
    total_dishes = await dishes_collection.count_documents({"storeUid": {"$in": outlet_uids}, "isDeleted": {"$ne": True}})
    
    # 5. Total Scans (Sum of qrScanCount)
    total_scans = 0
    scans_cursor = outlet_profiles_collection.find({
        "contactId": business_id, 
        "isDeleted": {"$ne": True},
        "isActive": True
    }, {"qrScanCount": 1})
    async for outlet in scans_cursor:
        total_scans += outlet.get("qrScanCount", 0)
        
    return {
        "outlets": total_outlets,
        "categories": total_categories,
        "dishes": total_dishes,
        "totalScans": total_scans
    }

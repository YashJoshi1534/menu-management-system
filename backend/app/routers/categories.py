from fastapi import APIRouter, HTTPException, status, Query
from typing import Optional
from app.database import categories_collection, dishes_collection
from app.models import CategoryDB
import uuid
from datetime import datetime

router = APIRouter(tags=["Categories"])



@router.put("/categories/{category_id}")
async def update_category(category_id: str, name: str, isPublished: Optional[bool] = None):
    update_data = {"name": name, "updatedAt": datetime.utcnow()}
    if isPublished is not None:
        update_data["isPublished"] = isPublished
        
    result = await categories_collection.update_one(
        {"categoryId": category_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"status": "success"}

@router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    # Soft delete dishes in this category
    await dishes_collection.update_many(
        {"categoryId": category_id},
        {"$set": {"isDeleted": True}}
    )
    
    # Soft delete category
    result = await categories_collection.update_one(
        {"categoryId": category_id},
        {"$set": {"isDeleted": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"status": "deleted"}

from fastapi import APIRouter, HTTPException, Query
from app.database import dishes_collection, requests_collection
from app.services.stability_service import generate_image_stability
from app.services.cloudinary_service import upload_image
from app.models import DishPaginationResponse, DishDB
from app.logger import get_logger
import math

logger = get_logger(__name__)
import asyncio

router = APIRouter(tags=["Dishes"])

@router.get("/requests/{request_id}/dishes", response_model=DishPaginationResponse)
async def get_dishes(
    request_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1)
):
    skip = (page - 1) * limit
    
    total_count = await dishes_collection.count_documents({"requestId": request_id})
    cursor = dishes_collection.find({"requestId": request_id}).skip(skip).limit(limit)
    
    dishes = await cursor.to_list(length=limit)
    
    # Using the first dish for the specific requirement of single dish view or just return list logic
    # The SRS says "Fetch Paginated Dish" singular in title but "dishes" in endpoint usually implies list.
    # However, output says "dish": {...} singular.
    # Let's support returning the LIST but adhering to SRS structure might mean they want one by one?
    # SRS Output: "dish": { ... } logic suggests one item per page if limit=1.
    # We will return the list but call the field "dishes" in our own logical internal structure,
    # but to match SRS output EXACTLY if limit=1 we might need to adjust.
    # Let's stick to standard pagination: returns list of dishes. 
    # If the user specifically wants strict SRS "dish": {} single object, I can adjust.
    # Assumption: "dish" in SRS output implies the 'current' dish in a wizard flow. 
    # I will return 'dishes' as a list to be safe for now.
    
    # Wait, SRS says: "GET /requests/{requestId}/dishes?page=1&limit=1" -> output "dish": {...}
    # It seems designed for a carousel where you fetch 1 at a time.
    
    dish_obj = dishes[0] if dishes else None

    return {
        "page": page,
        "totalPages": math.ceil(total_count / limit),
        "dish": dish_obj # strictly following SRS single-item return for limit=1 assumption
    }

@router.post("/requests/{request_id}/generate-image/{dish_id}")
async def generate_dish_image_route(request_id: str, dish_id: str):
    dish = await dishes_collection.find_one({"dishId": dish_id, "requestId": request_id})
    if not dish:
        raise HTTPException(status_code=404, detail="Dish not found")

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
            }}
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
async def update_dish(dish_id: str, update_data: dict):
    # Determine what fields to update
    # Expected keys: name, price, weight, description
    
    update_fields = {}
    if "name" in update_data:
        update_fields["name"] = update_data["name"]
    if "price" in update_data:
        try:
            update_fields["price"] = float(update_data["price"])
        except:
            pass # Ignore invalid price
    if "weight" in update_data:
        update_fields["weight"] = update_data["weight"]
    if "description" in update_data:
        update_fields["description"] = update_data["description"]
        
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")
        
    result = await dishes_collection.update_one(
        {"dishId": dish_id},
        {"$set": update_fields}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dish not found")
        
    return {"message": "Dish updated successfully", "updatedFields": update_fields}

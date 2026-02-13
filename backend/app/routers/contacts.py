from fastapi import APIRouter, HTTPException, status
from app.models import ContactCreate, ContactDB
from app.database import contacts_collection
import uuid
from datetime import datetime

router = APIRouter(prefix="/contacts", tags=["Contacts"])

@router.post("/", response_model=dict)
async def create_contact(contact: ContactCreate):
    # Check if email exists
    existing = await contacts_collection.find_one({"userEmail": contact.userEmail})
    if existing:
        # Fetch associated stores
        from app.database import store_profiles_collection
        cursor = store_profiles_collection.find({"contactId": existing["contactId"]})
        stores = []
        async for store in cursor:
            stores.append({
                "storeName": store["storeName"],
                "storeUid": store["storeUid"]
            })
            
        return {
            "contactId": existing["contactId"], 
            "message": "Welcome back!", 
            "existingStores": stores
        }

    contact_id = f"contact_{uuid.uuid4().hex[:8]}"
    new_contact = ContactDB(
        **contact.dict(),
        contactId=contact_id
    )

    await contacts_collection.insert_one(new_contact.dict())

    return {"contactId": contact_id, "existingStores": [], "message": "Contact created"}

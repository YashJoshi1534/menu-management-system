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
        # Fetch associated outlets
        from app.database import outlet_profiles_collection
        cursor = outlet_profiles_collection.find({"contactId": existing["contactId"]})
        outlets = []
        async for outlet in cursor:
            outlets.append({
                "outletName": outlet["storeName"],
                "outletUid": outlet["storeUid"]
            })
            
        return {
            "contactId": existing["contactId"], 
            "message": "Welcome back!", 
            "existingOutlets": outlets
        }

    contact_id = f"contact_{uuid.uuid4().hex[:8]}"
    new_contact = ContactDB(
        **contact.dict(),
        contactId=contact_id
    )

    await contacts_collection.insert_one(new_contact.dict())

    return {"contactId": contact_id, "existingStores": [], "message": "Contact created"}

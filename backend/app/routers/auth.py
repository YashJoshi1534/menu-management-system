from fastapi import APIRouter, HTTPException, status, Body
from app.models import BusinessDB, OTPRecord, BusinessCreate
from app.database import businesses_collection, otps_collection, store_profiles_collection
from app.services.email_service import send_otp_email
import random
import uuid
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/check-email")
async def check_email(email: str = Body(..., embed=True)):
    business = await businesses_collection.find_one({"email": email})
    if business:
        return {
            "exists": True,
            "business": {
                "businessId": business["businessId"],
                "name": business["name"],
                "email": business["email"]
            }
        }
    return {"exists": False}

@router.post("/send-otp")
async def send_otp(email: str = Body(..., embed=True), name: Optional[str] = Body(None, embed=True)):
    otp = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Store/Update OTP
    await otps_collection.update_one(
        {"email": email},
        {"$set": {"otp": otp, "expiresAt": expires_at}},
        upsert=True
    )
    
    # Send Email
    success = send_otp_email(email, otp)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send OTP email")
    
    return {"message": "OTP sent successfully"}

@router.post("/verify-otp")
async def verify_otp(
    email: str = Body(..., embed=True), 
    otp: str = Body(..., embed=True),
    name: Optional[str] = Body(None, embed=True)
):
    record = await otps_collection.find_one({"email": email})
    
    if not record or record["otp"] != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    if record["expiresAt"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")
    
    # Check if business exists
    business = await businesses_collection.find_one({"email": email})
    
    if not business:
        if not name:
             raise HTTPException(status_code=400, detail="Business name required for registration")
             
        business_id = f"biz_{uuid.uuid4().hex[:8]}"
        new_business = BusinessDB(
            businessId=business_id,
            name=name,
            email=email
        )
        await businesses_collection.insert_one(new_business.dict())
        business = new_business.dict()
    
    # Clean up OTP
    await otps_collection.delete_one({"email": email})
    
    # Fetch stores
    cursor = store_profiles_collection.find({"contactId": business["businessId"]}) # We'll migrate store contactId to businessId concept
    # Actually, current stores use contactId. We should probably align these.
    # For now, let's just return business info.
    
    return {
        "businessId": business["businessId"],
        "name": business["name"],
        "email": business["email"],
        "message": "Login successful"
    }

@router.get("/me/{business_id}")
async def get_me(business_id: str):
    business = await businesses_collection.find_one({"businessId": business_id}, {"_id": 0})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business

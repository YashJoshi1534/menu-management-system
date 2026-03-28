from fastapi import APIRouter, HTTPException, status, Body
from app.models import BusinessDB, OTPRecord, BusinessCreate, AdminConfigDB
from app.database import businesses_collection, otps_collection, outlet_profiles_collection, admin_config_collection
from app.services.email_service import send_otp_email
from app.services.cloudinary_service import upload_image
from app.services.auth_service import create_access_token, create_refresh_token, verify_token
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

@router.get("/config")
async def get_config():
    config = await admin_config_collection.find_one({})
    if not config:
        config_obj = AdminConfigDB()
        config = config_obj.dict()
        await admin_config_collection.insert_one(config)
    
    config.pop("_id", None)
    return config

@router.post("/send-otp")
async def send_otp(email: str = Body(..., embed=True), name: Optional[str] = Body(None, embed=True)):
    # 1. Get Config
    config_dict = await admin_config_collection.find_one({})
    if not config_dict:
        config_dict = AdminConfigDB().dict()
        await admin_config_collection.insert_one(config_dict)
    config = AdminConfigDB(**config_dict)
    
    # 2. Check existing OTP record for rate limiting
    record = await otps_collection.find_one({"email": email})
    
    if record:
        # Check if blocked
        if record.get("blockedUntil") and record["blockedUntil"] > datetime.utcnow():
            wait_time_minutes = max(1, int((record["blockedUntil"] - datetime.utcnow()).total_seconds() / 60))
            raise HTTPException(status_code=429, detail=f"You exceeded the limit of the OTP. Try again after {wait_time_minutes} minutes.")
            
        request_count = record.get("requestCount", 0) + 1
        
        if request_count > config.maxOtpResends:
            # Block the user
            blocked_until = datetime.utcnow() + timedelta(minutes=config.otpBlockDurationMinutes)
            await otps_collection.update_one(
                {"email": email},
                {"$set": {"blockedUntil": blocked_until, "requestCount": request_count}}
            )
            raise HTTPException(status_code=429, detail=f"You exceeded the limit of the OTP. Try again after {config.otpBlockDurationMinutes} minutes.")
    else:
        request_count = 1

    otp = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Store/Update OTP
    await otps_collection.update_one(
        {"email": email},
        {"$set": {
            "otp": otp, 
            "expiresAt": expires_at, 
            "requestCount": request_count,
            "blockedUntil": None
        }},
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
    name: Optional[str] = Body(None, embed=True),
    businessType: Optional[str] = Body(None, embed=True),
    phone: Optional[str] = Body(None, embed=True),
    logoData: Optional[str] = Body(None, embed=True)
):
    # 1. Reset requestCount to zero and clear OTP
    await otps_collection.update_one(
        {"email": email},
        {"$set": {"requestCount": 0, "otp": None, "blockedUntil": None}}
    )
    
    # 2. Fetch business info
    business = await businesses_collection.find_one({"email": email})
    
    if not business:
        if not name:
             raise HTTPException(status_code=400, detail="Business name required for registration")
             
        business_id = f"biz_{uuid.uuid4().hex[:8]}"
        
        logo_url = None
        if logoData:
            try:
                logo_url = upload_image(logoData, "business_logos", f"{business_id}_logo")
            except Exception as e:
                print(f"Failed to upload business logo: {e}")

        new_business = BusinessDB(
            businessId=business_id,
            name=name,
            email=email,
            businessType=businessType,
            phone=phone,
            logoUrl=logo_url
        )
        await businesses_collection.insert_one(new_business.dict())
        business = new_business.dict()
    
    # 3. Generate Tokens
    token_data = {"sub": business["email"], "businessId": business["businessId"]}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)
    
    # 4. Store Refresh Token (Single Session Constraint)
    await businesses_collection.update_one(
        {"businessId": business["businessId"]},
        {"$set": {"refreshToken": refresh_token}}
    )
    
    return {
        "businessId": business["businessId"],
        "name": business["name"],
        "email": business["email"],
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "message": "Login successful"
    }

@router.post("/refresh")
async def refresh_token(refreshToken: str = Body(..., embed=True)):
    payload = verify_token(refreshToken)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    
    email = payload.get("sub")
    business = await businesses_collection.find_one({"email": email})
    
    if not business or business.get("refreshToken") != refreshToken:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired or session invalidated")
        
    # Generate new tokens (Rotation)
    token_data = {"sub": business["email"], "businessId": business["businessId"]}
    new_access_token = create_access_token(data=token_data)
    new_refresh_token = create_refresh_token(data=token_data)
    
    # Update stored refresh token
    await businesses_collection.update_one(
        {"businessId": business["businessId"]},
        {"$set": {"refreshToken": new_refresh_token}}
    )
    
    return {
        "accessToken": new_access_token,
        "refreshToken": new_refresh_token
    }

@router.post("/logout")
async def logout(businessId: str = Body(..., embed=True)):
    await businesses_collection.update_one(
        {"businessId": businessId},
        {"$set": {"refreshToken": None}}
    )
    return {"message": "Logged out successfully"}

@router.get("/me/{business_id}")
async def get_me(business_id: str):
    business = await businesses_collection.find_one({"businessId": business_id}, {"_id": 0})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business

@router.put("/me/{business_id}")
async def update_business(
    business_id: str,
    name: Optional[str] = Body(None, embed=True),
    businessType: Optional[str] = Body(None, embed=True),
    phone: Optional[str] = Body(None, embed=True)
):
    update_data = {}
    if name is not None: update_data["name"] = name
    if businessType is not None: update_data["businessType"] = businessType
    if phone is not None: update_data["phone"] = phone
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
        
    result = await businesses_collection.update_one(
        {"businessId": business_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Business not found")
        
    return {"message": "Business updated successfully"}

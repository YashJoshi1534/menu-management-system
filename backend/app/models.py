from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
from datetime import datetime
from bson import ObjectId

# Helper for ObjectId
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

# --- Contact Models ---
class ContactBase(BaseModel):
    contactName: str
    userEmail: EmailStr
    userAddress: str

class ContactCreate(ContactBase):
    pass

class ContactDB(ContactBase):
    contactId: str
    storeUids: List[str] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

# --- Store Models ---
class StoreBase(BaseModel):
    storeName: str
    
class StoreCreate(StoreBase):
    pass # Logo handled via UploadFile

class StoreDB(StoreBase):
    storeUid: str
    contactId: str
    address: str
    city: str
    zipCode: str
    phone: Optional[str] = None # Keeping for compatibility if needed, but primary phone is in Business
    logoUrl: Optional[str] = None
    storeImages: List[str] = []
    currency: str = "₹"
    isActive: bool = True
    isDeleted: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class StoreUpdate(BaseModel):
    storeName: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zipCode: Optional[str] = None
    phone: Optional[str] = None
    isActive: Optional[bool] = None
    currency: Optional[str] = None
    logoUrl: Optional[str] = None

# --- Request Models ---
class RequestDB(BaseModel):
    requestId: str
    storeUid: str
    currentStep: int
    status: str # "in_progress", "completed"
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

# --- Category Models ---
class CategoryDB(BaseModel):
    categoryId: str
    storeUid: str
    requestId: str
    name: str
    isPublished: bool = False

# --- Dish Models ---
class DishDB(BaseModel):
    dishId: str
    requestId: str
    storeUid: str
    categoryId: Optional[str] = None
    name: str
    price: Optional[float] = None
    weight: Optional[str] = None
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    imageStatus: str = "pending" # "pending", "generating", "ready", "failed"
    imageIndex: int
    isPublished: bool = False
    generationCount: int = 0

# --- Business Models ---
class BusinessBase(BaseModel):
    name: str
    email: EmailStr
    businessType: Optional[str] = None
    phone: Optional[str] = None

class BusinessCreate(BusinessBase):
    pass

class BusinessDB(BusinessBase):
    businessId: str
    storeUids: List[str] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

# --- Admin Config Models ---
class AdminConfigDB(BaseModel):
    maxOtpResends: int = 3
    otpBlockDurationMinutes: int = 10
    otpResendWaitSeconds: int = 30
    imageGenerationLimit: int = 50
    imageGenerationLimitPerDish: int = 1

# --- OTP Models ---
class OTPRecord(BaseModel):
    email: EmailStr
    otp: str
    expiresAt: datetime
    requestCount: int = 1
    blockedUntil: Optional[datetime] = None

class DishPaginationResponse(BaseModel):
    page: int
    totalPages: int
    dish: Optional[DishDB]
    generationLimit: int = 1
    storeCurrency: str = "₹"

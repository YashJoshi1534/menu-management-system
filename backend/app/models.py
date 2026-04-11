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

# --- Outlet Models ---
class OutletBase(BaseModel):
    storeName: str  # DB field kept as storeName for data compatibility

class OutletCreate(OutletBase):
    pass  # Logo handled via UploadFile

class OutletDB(OutletBase):
    storeUid: str
    contactId: str
    address: str
    city: str
    zipCode: str
    phone: Optional[str] = None
    logoUrl: Optional[str] = None
    storeImages: List[str] = []
    currency: str = "₹"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    isActive: bool = True
    isDeleted: bool = False
    qrScanCount: int = 0
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class OutletUpdate(BaseModel):
    storeName: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zipCode: Optional[str] = None
    phone: Optional[str] = Field(None, pattern=r"^\+?\d{10,15}$")
    isActive: Optional[bool] = None
    currency: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    logoUrl: Optional[str] = None

# Backward-compat aliases (so any remaining code using old names still works during transition)
StoreDB = OutletDB
StoreUpdate = OutletUpdate

# --- Request Models ---
class RequestDB(BaseModel):
    requestId: str
    storeUid: str
    currentStep: int
    status: str  # "in_progress", "completed"
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

# --- Category Models ---
class CategoryDB(BaseModel):
    categoryId: str
    storeUid: str
    requestId: str
    name: str
    isPublished: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class Variant(BaseModel):
    variantType: Optional[str] = None
    label: str
    price: float

class Addon(BaseModel):
    name: str
    price: float

# --- Dish Models ---
class DishDB(BaseModel):
    dishId: str
    requestId: str
    storeUid: str
    categoryId: Optional[str] = None
    name: str
    categoryName: Optional[str] = None
    price: Optional[float] = None
    weight: Optional[str] = None
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    imageStatus: str = "pending"  # "pending", "generating", "ready", "failed"
    imageIndex: int
    isPublished: bool = False
    variants: List[Variant] = []
    addons: List[Addon] = []
    generationCount: int = 0
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

# --- Business Models ---
class BusinessBase(BaseModel):
    name: str
    email: EmailStr
    businessType: Optional[str] = None
    phone: Optional[str] = Field(None, pattern=r"^\+?\d{10,15}$")
    contactName: Optional[str] = None
    logoUrl: Optional[str] = None

class BusinessCreate(BusinessBase):
    pass

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    businessType: Optional[str] = None
    phone: Optional[str] = Field(None, pattern=r"^\+?\d{10,15}$")
    contactName: Optional[str] = None
    logoData: Optional[str] = None  # Base64 logo for upload

class BusinessDB(BusinessBase):
    businessId: str
    storeUids: List[str] = []
    refreshToken: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

# --- Admin Config Models ---
class AdminConfigDB(BaseModel):
    maxOtpResends: int = 3
    otpBlockDurationMinutes: int = 10
    otpResendWaitSeconds: int = 30
    imageGenerationLimit: int = 50
    imageGenerationLimitPerDish: int = 1
    maxImagesPerUpload: int = 5
    processCreationLimit: int = 3

# --- Business Config Models ---
class BusinessConfigDB(AdminConfigDB):
    businessId: str

class BusinessConfigUpdate(BaseModel):
    maxOtpResends: Optional[int] = None
    otpBlockDurationMinutes: Optional[int] = None
    otpResendWaitSeconds: Optional[int] = None
    imageGenerationLimit: Optional[int] = None
    imageGenerationLimitPerDish: Optional[int] = None
    maxImagesPerUpload: Optional[int] = None
    processCreationLimit: Optional[int] = None

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

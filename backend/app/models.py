from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
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
    logoUrl: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

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

class DishPaginationResponse(BaseModel):
    page: int
    totalPages: int
    dish: Optional[DishDB]

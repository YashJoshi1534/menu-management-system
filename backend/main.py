from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import contacts, outlets, requests, dishes, auth, admin, categories
from app.database import rename_legacy_collections
from dotenv import load_dotenv
import asyncio

load_dotenv()

app = FastAPI(title="Menu Management System")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600,
)

# Include Routers
app.include_router(contacts.router)
app.include_router(outlets.router)
app.include_router(requests.router)
app.include_router(dishes.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(categories.router)

@app.on_event("startup")
async def startup_event():
    await rename_legacy_collections()

@app.get("/")
async def root():
    return {"message": "Menu Management System API is running"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import contacts, stores, requests, dishes
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Menu Management System")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(contacts.router)
app.include_router(stores.router)
app.include_router(requests.router)
app.include_router(dishes.router)

@app.get("/")
async def root():
    return {"message": "Menu Management System API is running"}

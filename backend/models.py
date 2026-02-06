# models.py
from pymongo import MongoClient
import os

MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://yashjoshiordex:joshi2001@cluster0.fb6fq.mongodb.net/?retryWrites=true&w=majority"
)

client = MongoClient(MONGO_URI)
db = client["mydatabase"]

# ✅ MASTER store info
stores_collection = db["stores"]

# ✅ Image + extracted content
storeDetail_collection = db["storeDetail"]

# ✅ Normalized menu
categories_collection = db["categories"]
dishes_collection = db["dishes"]


# client = genai.Client(api_key="AIzaSyCWjV9oaLDt7ccokwg8iW_ogp9wciDGg6Q")
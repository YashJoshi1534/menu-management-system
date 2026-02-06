import os
import json
import uuid
import re
import logging
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai.errors import ClientError
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
import time
import requests
import base64
from io import BytesIO


load_dotenv()

# ☁️ Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)

from models import (
    stores_collection,
    storeDetail_collection,
    categories_collection,
    dishes_collection
)

# -------------------------------------------------
# LOGGING
# -------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger(__name__)

def log(step, msg, req=None, img=None):
    prefix = []
    if req:
        prefix.append(f"REQ:{req}")
    if img is not None:
        prefix.append(f"IMG:{img}")
    logger.info(" | ".join(prefix + [step, msg]))

def warn(step, msg, req=None, img=None):
    prefix = []
    if req:
        prefix.append(f"REQ:{req}")
    if img is not None:
        prefix.append(f"IMG:{img}")
    logger.warning(" | ".join(prefix + [step, msg]))

# -------------------------------------------------
# FASTAPI APP
# -------------------------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# GEMINI CONFIG
# -------------------------------------------------
client = genai.Client(api_key="AIzaSyBXcI6MDjeNY4kJGXyMiKqWGA9Or77T1w8")
MODEL_NAME = "gemini-2.5-flash"

MENU_PROMPT = """
You are extracting a restaurant menu from an image.

Return JSON ONLY in this schema:

{
  "menu_type": "poster | list | table | unknown",
  "category_title": string | null,
  "items": [
    {
      "name": string,
      "price": number | null,
      "currency": string | null,
      "description": string | null
    }
  ],
  "notes": string | null
}

Rules:
- Extract ALL visible menu items
- Do NOT guess missing values
- Use null if value not visible
- Preserve original language
- Prices may appear anywhere near the item
- Return ONLY valid JSON
"""

# -------------------------------------------------
# UTILS
# -------------------------------------------------
# Recommended SDXL Model Slug
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
SDXL_MODEL_VERSION = "stability-ai/sdxl:7762fdc03482202905395f7d51a6d11629b86307536bc0d95536572b52125f99"

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[\s_-]+", "-", text)

# -------------------------------------------------
# GEMINI IMAGE → JSON
# -------------------------------------------------
async def extract_json_from_image(image_path, req_id, img_idx):
    log("GEMINI_CALL", f"Calling Gemini for {image_path}", req_id, img_idx)

    with open(image_path, "rb") as f:
        img_bytes = f.read()

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=[{
            "role": "user",
            "parts": [
                {"text": MENU_PROMPT},
                {
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": img_bytes
                    }
                }
            ]
        }]
    )

    raw = response.text.strip().strip("```json").strip("```")
    log("GEMINI_RAW", f"Response length={len(raw)}", req_id, img_idx)

    try:
        data = json.loads(raw)

        if isinstance(data, list):
            warn("GEMINI_PARSE", "List returned, using first element", req_id, img_idx)
            data = data[0] if data else None

        if not isinstance(data, dict):
            warn("GEMINI_PARSE", f"Invalid type {type(data)}", req_id, img_idx)
            return None

        log("GEMINI_PARSE", "JSON parsed successfully", req_id, img_idx)
        return data

    except Exception as e:
        warn("GEMINI_PARSE", f"JSON parse failed: {e}", req_id, img_idx)
        return None

# -------------------------------------------------
# NORMALIZE MENU
# -------------------------------------------------
def normalize_menu(menu_items, store_uid, menu_type):
    categories = []
    dishes = []

    # ✅ POSTER / LIST (flat menu)
    if menu_type in ("poster", "list") and isinstance(menu_items, list):
        category_id = f"cat_{uuid.uuid4().hex[:8]}"
        categories.append({
            "categoryId": category_id,
            "storeUid": store_uid,
            "name": "Menu Items"
        })

        for item in menu_items:
            if not isinstance(item, dict):
                continue

            name = item.get("name")
            if not name:
                continue

            dishes.append({
                "dishId": f"dish_{uuid.uuid4().hex[:8]}",
                "storeUid": store_uid,
                "categoryId": category_id,
                "name": name,
                "price": item.get("price"),
                "weight": None,
                "imageUrl": None,
                "imageStatus": "pending"
            })

        return categories, dishes

    # fallback
    warn("NORMALIZE", f"Unsupported menu_type={menu_type}")
    return categories, dishes

def generate_stable_diffusion_image(prompt: str, req_id=None, dish=None) -> bytes:
    log("SD_START", f"Generating image for {dish}", req_id)

    response = requests.post(
        "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
        headers={
            "Authorization": f"Bearer {os.getenv('STABILITY_API_KEY')}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        json={
            "text_prompts": [
                {"text": prompt}
            ],
            "cfg_scale": 7,
            "height": 1024,
            "width": 1024,
            "samples": 1,
            "steps": 30
        },
        timeout=60
    )

    if response.status_code != 200:
        raise Exception(
            f"StabilityAI error {response.status_code}: {response.text}"
        )

    image_base64 = response.json()["artifacts"][0]["base64"]
    image_bytes = base64.b64decode(image_base64)

    log("SD_DONE", f"Image generated (bytes)", req_id)
    return image_bytes

def upload_to_cloudinary(
    image_bytes: bytes,
    store_name: str,
    dish_name: str,
    req_id: str | None = None
) -> str:
    store_slug = slugify(store_name)
    dish_slug = slugify(dish_name)
    folder_path = f"stores/{store_slug}"

    log(
        "CLOUDINARY_UPLOAD",
        f"Uploading {dish_slug}.png to {folder_path}",
        req_id
    )

    result = cloudinary.uploader.upload(
        image_bytes,
        folder=folder_path,
        public_id=dish_slug,
        overwrite=True,
        resource_type="image"
    )

    secure_url = result["secure_url"]

    log("CLOUDINARY_DONE", f"Uploaded → {secure_url}", req_id)
    return secure_url


# -------------------------------------------------
# API
# -------------------------------------------------
@app.post("/create-store-ai")
async def create_store(
    storeName: str = Form(...),
    address: str = Form(...),
    email: str = Form(...),
    images: list[UploadFile] = File(...)
):
    request_id = uuid.uuid4().hex[:6]
    log("START", f"Creating store: {storeName}", request_id)

    store_uid = uuid.uuid4().hex
    saved_images = []
    extracted_content = []

    all_categories = []
    all_dishes = []
    menu_type = None

    # 1️⃣ Save store
    stores_collection.insert_one({
        "storeUid": store_uid,
        "storeName": storeName,
        "address": address,
        "email": email
    })
    log("STORE", f"Saved store UID={store_uid}", request_id)

    # 2️⃣ Process images
    for idx, img in enumerate(images, start=1):
        log("IMAGE_START", f"Processing {img.filename}", request_id, idx)

        file_path = f"{UPLOAD_FOLDER}/{img.filename}"
        with open(file_path, "wb") as f:
            f.write(await img.read())
        saved_images.append(file_path)

        extracted = await extract_json_from_image(file_path, request_id, idx)
        if not extracted:
            warn("IMAGE_SKIP", "Extraction failed", request_id, idx)
            continue

        # Pull menu_type once
        if not menu_type:
            menu_type = extracted.pop("menu_type", None)
            log("MENU_TYPE", f"{menu_type}", request_id, idx)

        menu_items = extracted.get("items")
        log("MENU_ITEMS", f"type={type(menu_items)}", request_id, idx)

        if not menu_items:
            warn("MENU_EMPTY", "No items found", request_id, idx)
            continue

        categories, dishes = normalize_menu(menu_items, store_uid, menu_type)
        all_categories.extend(categories)
        all_dishes.extend(dishes)

        extracted_content.append(extracted)

        log(
            "NORMALIZE",
            f"categories={len(categories)} dishes={len(dishes)}",
            request_id,
            idx
        )

    # 3️⃣ Save DB
    if all_categories:
        categories_collection.insert_many(all_categories)
    if all_dishes:
        dishes_collection.insert_many(all_dishes)

    log(
        "DB_INSERT",
        f"categories={len(all_categories)} dishes={len(all_dishes)}",
        request_id
    )

    # 4️⃣ Save store detail (menuType OUTSIDE)
    storeDetail_collection.insert_one({
        "storeUid": store_uid,
        "menuType": menu_type,
        "images": saved_images,
        "extractedContent": extracted_content
    })
    log("STORE_DETAIL", "Saved storeDetail", request_id)

    # 5️⃣ URL
    store_url = f"/{store_uid}/{slugify(storeName)}"

    return JSONResponse({
        "message": "Store created successfully",
        "storeUid": store_uid,
        "storeUrl": store_url,
        "menuType": menu_type,
        "categoriesInserted": len(all_categories),
        "dishesInserted": len(all_dishes),
        "imagesProcessed": len(saved_images)
    })

@app.get("/stores/{store_uid}/dishes")
async def get_dishes(store_uid: str):
    log("GET_DISHES", f"Fetching dishes for store {store_uid}")

    dishes = list(dishes_collection.find(
        {"storeUid": store_uid},
        {"_id": 0}
    ))

    log("GET_DISHES", f"Found {len(dishes)} dishes for store {store_uid}")
    return dishes

@app.post("/generate-dish-image/{dish_id}")
async def generate_dish_image(dish_id: str):
    req_id = uuid.uuid4().hex[:6]
    log("GEN_IMAGE_START", f"dishId={dish_id}", req_id)

    dish = dishes_collection.find_one({"dishId": dish_id})
    if not dish:
        warn("GEN_IMAGE", "Dish not found", req_id)
        return JSONResponse({"error": "Dish not found"}, status_code=404)

    if dish.get("imageStatus") == "ready":
        log("GEN_IMAGE_SKIP", "Image already ready", req_id)
        return {"imageUrl": dish["imageUrl"]}

    store = stores_collection.find_one({"storeUid": dish["storeUid"]})
    store_name = store["storeName"]

    dishes_collection.update_one(
        {"dishId": dish_id},
        {"$set": {"imageStatus": "generating"}}
    )

    try:
        prompt = (
            f"Professional food photography of {dish['name']}, "
            "Indian restaurant style, soft lighting, high detail, 4k"
        )

        image_bytes = generate_stable_diffusion_image(
            prompt,
            req_id=req_id,
            dish=dish["name"]
        )

        cloudinary_url = upload_to_cloudinary(
            image_bytes=image_bytes,
            store_name=store_name,
            dish_name=dish["name"],
            req_id=req_id
        )


        dishes_collection.update_one(
            {"dishId": dish_id},
            {
                "$set": {
                    "imageUrl": cloudinary_url,
                    "imageStatus": "ready"
                }
            }
        )

        log("GEN_IMAGE_DONE", "Image ready & saved", req_id)
        return {"imageUrl": cloudinary_url}

    except Exception as e:
        error_msg = str(e)

    if "429" in error_msg or "rate limit" in error_msg.lower():
        warn("GEN_IMAGE_RATE_LIMIT", "Replicate rate limit hit", req_id)

        dishes_collection.update_one(
            {"dishId": dish_id},
            {"$set": {"imageStatus": "pending"}}
        )

        return JSONResponse(
            {
                "error": "Image generation is busy. Please retry in a few seconds."
            },
            status_code=429
        )

    warn("GEN_IMAGE_FAIL", error_msg, req_id)

    dishes_collection.update_one(
        {"dishId": dish_id},
        {"$set": {"imageStatus": "failed"}}
    )

    return JSONResponse({"error": error_msg}, status_code=500)

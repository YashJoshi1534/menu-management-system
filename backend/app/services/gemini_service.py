import os
import json
from google import genai
from google.genai.errors import ClientError
from app.logger import get_logger
from dotenv import load_dotenv

logger = get_logger(__name__)

load_dotenv()

# Initialize Gemini Client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_NAME = "gemini-1.5-flash"

async def generate_image_prompt(dish_name: str):
    """
    Generates a creative English visual description for the dish.
    """
    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=f"Describe the food item '{dish_name}' in English for a text-to-image generator. Keep it under 20 words. Focus on visual appearance.",
        )
        return response.text.strip()
    except Exception as e:
        logger.error(f"Prompt Generation Error: {e}")
        return dish_name # Fallback to original

MENU_PROMPT = """
You are extracting a restaurant menu from an image.

Return JSON ONLY in this schema:

{
  "categories": [
    {
      "name": "Category Name (e.g. Starters, Mains)",
      "items": [
        {
          "name": string,
          "price": number | null,
          "currency": string | null,
          "description": string | null,
          "weight": string | null
        }
      ]
    }
  ]
}

Rules:
- Extract ALL visible menu items grouped by their category.
- If no category is visible, use "General" or "Uncategorized".
- Do NOT guess missing values.
- Use null if value not visible.
- Preserve original language.
- Prices may appear anywhere near the item.
- Return ONLY valid JSON.
"""

async def extract_menu_data(image_path: str):
    """
    Sends image to Gemini and returns extracted JSON.
    """
    print(f"DEBUG: Starting extraction for {image_path} using {MODEL_NAME}")
    try:
        with open(image_path, "rb") as f:
            img_bytes = f.read()
        
        logger.info(f"Image read successfully, size: {len(img_bytes)} bytes")

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
        
        logger.info("Gemini response received")
        raw = response.text.strip().strip("```json").strip("```")
        logger.debug(f"Raw response: {raw[:100]}...") # Print first 100 chars
        
        data = json.loads(raw)
        
        # Normalize if list
        if isinstance(data, list):
            data = data[0] if data else None
            
        logger.info("JSON parsed successfully")
        return data

    except Exception as e:
        logger.error(f"Gemini Extraction Error: {e}")
        return None

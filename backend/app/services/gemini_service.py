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
MODEL_NAME = "gemini-2.5-flash"

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
          "weight": string | null,
          "variants": [
             { "label": string (e.g. "Small", "With Butter"), "price": number, "variantType": string (e.g. "Size", "Type", "Preparation") }
          ],
          "addons": [
             { "name": string (e.g. "Extra Cheese"), "price": number }
          ]
        }
      ]
    }
  ]
}

Rules:
- Extract ALL visible menu items grouped by their category.
- **Table / Column Format Menus**: If a menu lists dishes as rows and prices in columns headers (e.g. "Oil", "Butter", or "S", "M", "L"):
    - Extract the dish name (e.g., "Sada Dosa").
    - Put the different prices under the `variants` array as `{"variantType": "Type", "label": "Oil", "price": 90}`.
    - Set the main `price` field to `null` or `0` if there isn't a single default price.
- **Add-ons**: Extras or customizations (e.g., "+ Cheese: 50") go in the `addons` array.
- If no category is visible, use "General" or "Uncategorized".
- Do NOT guess missing values. Use `null` if value not visible.
- Preserve original language.
- Return ONLY valid JSON.
"""

async def extract_menu_data(img_bytes: bytes):
    """
    Sends image bytes to Gemini and returns extracted JSON.
    """
    try:
        logger.info(f"Image received for extraction, size: {len(img_bytes)} bytes")

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

import requests
import os
import base64
from app.logger import get_logger
from dotenv import load_dotenv

logger = get_logger(__name__)

load_dotenv()

STABILITY_API_KEY = os.getenv("STABILITY_API_KEY")
API_HOST = "https://api.stability.ai"
ENGINE_ID = "stable-diffusion-xl-1024-v1-0"

def generate_image_stability(prompt: str):
    """
    Generates an image using Stability AI SDXL.
    Returns image bytes.
    """
    api_key = os.getenv("STABILITY_API_KEY")
    if not api_key:
        raise Exception("Missing STABILITY_API_KEY")

    api_host = os.getenv('API_HOST', 'https://api.stability.ai')
    engine_id = "stable-diffusion-xl-beta-v2-2-2" # Or stable-diffusion-v1-6

    logger.info(f"Generating image with Stability AI for prompt: {prompt}")

    response = requests.post(
        f"{api_host}/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {api_key}"
        },
        json={
            "text_prompts": [
                {"text": prompt}
            ],
            "cfg_scale": 7,
            "height": 1024,
            "width": 1024,
            "samples": 1,
            "steps": 30,
        },
    )
    
    logger.info(f"Stability AI Status Code: {response.status_code}")

    if response.status_code != 200:
        logger.error(f"Stability AI Error Body: {response.text}")
        raise Exception(f"Non-200 response: {str(response.content)}")

    data = response.json()

    # Decode the first image
    for image in data["artifacts"]:
        return base64.b64decode(image["base64"])
    
    return None

import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv

load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)

def upload_image(file_content, folder: str, public_id: str):
    """
    Uploads an image to Cloudinary.
    """
    try:
        response = cloudinary.uploader.upload(
            file_content,
            folder=folder,
            public_id=public_id,
            resource_type="image",
            overwrite=True
        )
        return response.get("secure_url")
    except Exception as e:
        print(f"Cloudinary Upload Error: {e}")
        raise e

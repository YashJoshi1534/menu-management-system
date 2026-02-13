# 🍽️ AI Menu Management System

A powerful, AI-driven application that digitizes restaurant menus. It extracts menu items from images using **Google Gemini**, generates mouth-watering dish images using **Stability AI**, and creates a stunning, interactive public menu website for restaurants.

## ✨ Features

-   **📸 AI Menu Extraction**: Upload a photo of a physical menu, and the system uses **Gemini 1.5 Flash** to automatically extract dish names, descriptions, prices, and categories.
-   **🎨 AI Image Generation**: Automatically generates high-quality, realistic food images for each dish using **Stability AI** based on the dish description.
-   **🌐 Public Menu Page**: Instantly deploys a beautiful, responsive public menu website for the restaurant (Light/Dark mode supported).
-   **✏️ Menu Editor**: Full control to edit dish details, prices, weights, and regenerate images.
-   **📂 Cloud Storage**: Securely stores images and assets using **Cloudinary**.
-   **⚡ Modern Tech Stack**: Built with **FastAPI** (Python) and **React** (Vite + Tailwind CSS).

---

## 🛠️ Tech Stack

### Backend
-   **Framework**: FastAPI
-   **Database**: MongoDB (Motor Async Driver)
-   **AI Services**:
    -   Google Gemini API (OCR & Data Extraction)
    -   Stability AI (Image Generation)
-   **Storage**: Cloudinary
-   **Logging**: Custom centralized logging

### Frontend
-   **Framework**: React (Vite)
-   **Styling**: Tailwind CSS
-   **Icons**: React Icons
-   **HTTP Client**: Axios
-   **Routing**: React Router DOM

---

## � Getting Started

### Prerequisites
-   Node.js & npm
-   Python 3.8+
-   MongoDB Instance (Local or Atlas)
-   API Keys for: Gemini, Stability AI, Cloudinary

### 1️⃣ Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Create a virtual environment and activate it:
    ```bash
    python -m venv venv
    # Windows
    venv\Scripts\activate
    # Mac/Linux
    source venv/bin/activate
    ```

3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4.  Create a `.env` file in the `backend` directory with the following variables:
    ```env
    MONGODB_URL=mongodb://localhost:27017
    DB_NAME=menu_management
    GEMINI_API_KEY=your_gemini_key
    STABILITY_API_KEY=your_stability_key
    CLOUDINARY_CLOUD_NAME=your_cloud_name
    CLOUDINARY_API_KEY=your_api_key
    CLOUDINARY_API_SECRET=your_api_secret
    ```

5.  Run the server:
    ```bash
    uvicorn main:app --reload
    ```
    The backend will start at `http://localhost:8000`.

### 2️⃣ Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Create a `.env` file in the `frontend` directory (optional if hardcoded, but recommended):
    ```env
    VITE_API_BASE_URL=http://localhost:8000
    ```

4.  Run the development server:
    ```bash
    npm run dev
    ```
    The frontend will start at `http://localhost:5173`.

---

## 📱 User Flow

1.  **Enter Contact Details**: User registers with name and email.
2.  **Create Store**: User sets up a restaurant profile and uploads a logo.
3.  **Upload Menu**: User uploads images of the physical menu cards.
4.  **AI Extraction**: System processes images and lists recognized dishes.
5.  **Generate Assets**: User reviews dishes and triggers AI image generation.
6.  **Publish**: A public link is generated (e.g., `/:storeUid/:storeName`).
7.  **Manage**: User can edit the menu and regenerate images anytime.

---

## 📄 License

This project is licensed under the MIT License.

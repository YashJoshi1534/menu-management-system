import { Routes, Route } from "react-router-dom";
import StoreRegistration from "../Pages/StoreRegistration";
import StorePage from "../Pages/StorePage";

export default function AppRoutes() {
    return (
        <Routes>
            {/* Home / Store Registration */}
            <Route path="/" element={<StoreRegistration />} />

            {/* Dynamic Store Page */}
            <Route path="/:storeUid/:storeSlug" element={<StorePage />} />

            {/* Optional: 404 fallback */}
            <Route
                path="*"
                element={
                    <div className="min-h-screen flex items-center justify-center text-gray-600">
                        Page not found
                    </div>
                }
            />
        </Routes>
    );
}

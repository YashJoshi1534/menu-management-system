import { Routes, Route } from "react-router-dom";
import ContactForm from "../Pages/ContactForm";
import StoreSetup from "../Pages/StoreSetup";
import Dashboard from "../Pages/Dashboard";
import MenuUpload from "../Pages/MenuUpload";
import DishGeneration from "../Pages/DishGeneration";
import Completion from "../Pages/Completion";
import PublicMenu from "../Pages/PublicMenu";
import ManageMenu from "../Pages/ManageMenu";

export default function AppRoutes() {
    return (
        <Routes>
            {/* Step 1: Contact Form */}
            <Route path="/" element={<ContactForm />} />

            {/* Step 2: Store Setup */}
            <Route path="/store-setup" element={<StoreSetup />} />

            {/* Step 3: Dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Step 4: Menu Upload */}
            <Route path="/menu-upload" element={<MenuUpload />} />

            {/* Step 5: Dish Generation */}
            <Route path="/dish-generation" element={<DishGeneration />} />

            {/* Step 6: Completion */}
            <Route path="/completion" element={<Completion />} />

            {/* Public Menu */}
            <Route path="/:storeUid/:storeName" element={<PublicMenu />} />

            {/* Manage Menu */}
            <Route path="/manage-menu/:storeUid" element={<ManageMenu />} />

            {/* Fallback */}
            <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
    );
}

import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../Pages/Login";
import VerifyOTP from "../Pages/VerifyOTP";
import StoreSetup from "../Pages/StoreSetup";
import Dashboard from "../Pages/Dashboard";
import MenuUpload from "../Pages/MenuUpload";
import DishGeneration from "../Pages/DishGeneration";
import Completion from "../Pages/Completion";
import PublicMenu from "../Pages/PublicMenu";
import ManageMenu from "../Pages/ManageMenu";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) return <Navigate to="/" replace />;
    return (
        <>
            <Navbar />
            {children}
        </>
    );
};

export default function AppRoutes() {
    return (
        <Routes>
            {/* Public Auth Flow */}
            <Route path="/" element={<Login />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />

            {/* Protected Routes */}
            <Route path="/store-setup" element={<ProtectedRoute><StoreSetup /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/menu-upload" element={<ProtectedRoute><MenuUpload /></ProtectedRoute>} />
            <Route path="/dish-generation" element={<ProtectedRoute><DishGeneration /></ProtectedRoute>} />
            <Route path="/completion" element={<ProtectedRoute><Completion /></ProtectedRoute>} />
            <Route path="/manage-menu/:storeUid" element={<ProtectedRoute><ManageMenu /></ProtectedRoute>} />

            {/* Public Menu (No Navbar needed as it's for customers) */}
            <Route path="/:storeUid/:storeName" element={<PublicMenu />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

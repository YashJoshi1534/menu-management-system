import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../Pages/Login";
import VerifyOTP from "../Pages/VerifyOTP";
import OutletSetup from "../Pages/OutletSetup";
import Dashboard from "../Pages/Dashboard";
import MenuUpload from "../Pages/MenuUpload";
import DishGeneration from "../Pages/DishGeneration";
import Completion from "../Pages/Completion";
import PublicMenu from "../Pages/PublicMenu";
import ManageMenu from "../Pages/ManageMenu";
import ConfigureOutlets from "../Pages/ConfigureOutlets";
import ViewOutlets from "../Pages/ViewOutlets";
import TermsOfService from "../Pages/TermsOfService";
import PrivacyPolicy from "../Pages/PrivacyPolicy";
import OutletBrowsing from "../Pages/OutletBrowsing";
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
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />

            {/* Protected Routes */}
            <Route path="/outlet-setup" element={<ProtectedRoute><OutletSetup /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/view-outlets" element={<ProtectedRoute><ViewOutlets /></ProtectedRoute>} />
            <Route path="/business-details" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/menu-upload" element={<ProtectedRoute><MenuUpload /></ProtectedRoute>} />
            <Route path="/dish-generation" element={<ProtectedRoute><DishGeneration /></ProtectedRoute>} />
            <Route path="/completion" element={<ProtectedRoute><Completion /></ProtectedRoute>} />
            <Route path="/manage-menu" element={<ProtectedRoute><ViewOutlets /></ProtectedRoute>} />
            <Route path="/manage-menu/:outletUid" element={<ProtectedRoute><ManageMenu /></ProtectedRoute>} />
            <Route path="/manage-menu/:outletUid/category/:categoryId" element={<ProtectedRoute><ManageMenu /></ProtectedRoute>} />
            <Route path="/configure-outlets" element={<ProtectedRoute><ConfigureOutlets /></ProtectedRoute>} />

            {/* Public Menu (No Navbar needed as it's for customers) */}
            <Route path="/:businessId" element={<OutletBrowsing />} />
            <Route path="/:outletUid/:outletName" element={<PublicMenu />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

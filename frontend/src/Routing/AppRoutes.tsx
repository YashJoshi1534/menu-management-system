import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

// Lazy Load Pages
const Login = lazy(() => import("../Pages/Login"));
const VerifyOTP = lazy(() => import("../Pages/VerifyOTP"));
const OutletSetup = lazy(() => import("../Pages/OutletSetup"));
const Dashboard = lazy(() => import("../Pages/Dashboard"));
const MenuUpload = lazy(() => import("../Pages/MenuUpload"));
const DishGeneration = lazy(() => import("../Pages/DishGeneration"));
const Completion = lazy(() => import("../Pages/Completion"));
const PublicMenu = lazy(() => import("../Pages/PublicMenu"));
const ManageMenu = lazy(() => import("../Pages/ManageMenu"));
const ConfigureOutlets = lazy(() => import("../Pages/ConfigureOutlets"));
const ViewOutlets = lazy(() => import("../Pages/ViewOutlets"));
const TermsOfService = lazy(() => import("../Pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("../Pages/PrivacyPolicy"));
const OutletBrowsing = lazy(() => import("../Pages/OutletBrowsing"));

// Premium Loading Spinner fallback
const LoadingSpinner = () => null;

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
        <Suspense fallback={<LoadingSpinner />}>
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
                <Route path="/manage-menu/:outletUid/categories" element={<ProtectedRoute><ManageMenu /></ProtectedRoute>} />
                <Route path="/manage-menu/:outletUid/category/:categoryId" element={<ProtectedRoute><ManageMenu /></ProtectedRoute>} />
                <Route path="/configure-outlets" element={<ProtectedRoute><ConfigureOutlets /></ProtectedRoute>} />

                {/* Public Menu (No Navbar needed as it's for customers) */}
                <Route path="/:businessId" element={<OutletBrowsing />} />
                <Route path="/:outletUid/:outletName" element={<PublicMenu />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
}

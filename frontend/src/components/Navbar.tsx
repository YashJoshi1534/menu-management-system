import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { FiLogOut, FiHome, FiSettings } from "react-icons/fi";
import { useEffect, useState } from "react";
import api from "../api/client";

export default function Navbar() {
    const { business, logout, selectedStoreUid, setSelectedStoreUid } = useAuth();
    const [storeInfo, setStoreInfo] = useState<any>(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const dashboardRoutes = ["/dashboard", "/store-setup", "/view-stores", "/business-details", "/configure-stores"];
        if (dashboardRoutes.includes(location.pathname)) {
            setStoreInfo(null);
            return;
        }

        const fetchStoreInfo = async () => {
            if (selectedStoreUid) {
                try {
                    const res = await api.get(`/stores/${selectedStoreUid}/menu`);
                    setStoreInfo(res.data.store);
                } catch (err) {
                    console.error("Failed to fetch store info", err);
                }
            } else {
                setStoreInfo(null);
            }
        };
        fetchStoreInfo();
    }, [selectedStoreUid, location.pathname, setSelectedStoreUid]);

    if (!business) return null;

    return (
        <nav className="w-full bg-white/80 backdrop-blur-md border-b border-gray-100/50 px-4 py-4 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center gap-6">
                <button
                    onClick={() => {
                        setSelectedStoreUid(null);
                        navigate("/dashboard");
                    }}
                    className="flex items-center gap-3 text-gray-900 transition-colors group"
                >
                    <div className="bg-blue-50 p-2.5 rounded-2xl transition-colors">
                        <FiHome className="text-2xl text-blue-600" />
                    </div>
                    <span className="text-xl font-[1000] tracking-tight whitespace-nowrap transition-colors">
                        Dashboard <span className="text-gray-300 font-normal mx-1">|</span> {business.name}
                    </span>
                </button>

                {storeInfo && (
                    <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="h-8 w-px bg-gray-200/60 rounded-full"></div>
                        <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100/50">
                            {storeInfo.logoUrl ? (
                                <img
                                    src={storeInfo.logoUrl}
                                    alt={storeInfo.storeName}
                                    className="w-7 h-7 rounded-full object-cover shadow-sm"
                                />
                            ) : (
                                <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                    {storeInfo.storeName?.charAt(0)}
                                </div>
                            )}
                            <span className="font-semibold text-gray-800 text-sm tracking-tight pr-2">
                                {storeInfo.storeName} {storeInfo.city && <span className="text-gray-400 font-normal">/ {storeInfo.city}</span>}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 sm:gap-5">
                <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-400 font-medium">{business.email}</p>
                </div>
                <button
                    onClick={() => navigate("/configure-stores")}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl font-semibold transition-all group"
                    title="Settings"
                >
                    <FiSettings className="group-hover:rotate-45 transition-transform" />
                    <span className="hidden md:inline">Settings</span>
                </button>
                <button
                    onClick={logout}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl font-semibold transition-all group"
                    title="Logout"
                >
                    <FiLogOut className="group-hover:-translate-x-1 transition-transform" />
                    <span className="hidden md:inline">Logout</span>
                </button>
            </div>
        </nav>
    );
}

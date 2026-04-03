import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { FiLogOut, FiSettings } from "react-icons/fi";
import { useEffect, useState } from "react";
import api from "../api/client";

export default function Navbar() {
    const { business, logout, selectedOutletUid, setSelectedOutletUid } = useAuth();
    const [outletInfo, setOutletInfo] = useState<any>(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const dashboardRoutes = ["/dashboard", "/outlet-setup", "/view-outlets", "/business-details", "/configure-outlets"];
        if (dashboardRoutes.includes(location.pathname)) {
            setOutletInfo(null);
            return;
        }

        const fetchOutletInfo = async () => {
            if (selectedOutletUid) {
                try {
                    const res = await api.get(`/outlets/${selectedOutletUid}/menu`);
                    setOutletInfo(res.data.outlet);
                } catch (err) {
                    console.error("Failed to fetch outlet info", err);
                }
            } else {
                setOutletInfo(null);
            }
        };
        fetchOutletInfo();
    }, [selectedOutletUid, location.pathname, setSelectedOutletUid]);

    if (!business) return null;

    return (
        <nav className="w-full bg-white/80 backdrop-blur-md border-b border-gray-100/50 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-50 overflow-hidden">
            <div className="flex items-center gap-4 lg:gap-8 min-w-0 flex-1">
                <button
                    onClick={() => {
                        setSelectedOutletUid(null);
                        navigate("/dashboard");
                    }}
                    className="flex items-center gap-3 text-gray-900 transition-colors group"
                >
                    <div className="bg-blue-50 p-1.5 rounded-2xl transition-colors shrink-0">
                        {business.logoUrl ? (
                            <img 
                                src={business.logoUrl} 
                                alt={business.name} 
                                className="w-9 h-9 rounded-xl object-cover shadow-sm" 
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-black text-lg">
                                {business.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <span className="text-xl font-[1000] tracking-tight whitespace-nowrap transition-colors flex items-center">
                        <span className="truncate max-w-[180px] sm:max-w-[250px] md:max-w-[350px]">{business.name}</span>
                    </span>
                </button>

                {outletInfo && (
                    <div className="flex items-center gap-2 md:gap-4 animate-in fade-in slide-in-from-left-4 duration-500 min-w-0">
                        <div className="h-6 w-px bg-gray-200/60 rounded-full hidden sm:block"></div>
                        <div className="flex items-center gap-2 md:gap-3 bg-indigo-50/50 px-2 md:px-4 py-1.5 rounded-full border border-indigo-100/50 min-w-0 max-w-[150px] sm:max-w-none">
                            {outletInfo.logoUrl ? (
                                <img
                                    src={outletInfo.logoUrl}
                                    alt={outletInfo.storeName}
                                    className="w-6 h-6 md:w-8 md:h-8 rounded-full object-cover shadow-sm shrink-0"
                                />
                            ) : (
                                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px] md:text-xs shrink-0">
                                    {outletInfo.storeName?.charAt(0)}
                                </div>
                            )}
                            <div className="flex flex-col min-w-0 leading-tight">
                                <span className="font-bold text-gray-800 text-[10px] md:text-xs truncate">
                                    {outletInfo.storeName}
                                </span>
                                {outletInfo.city && (
                                    <span className="text-gray-400 font-medium text-[8px] md:text-[10px] truncate uppercase tracking-tighter">
                                        {outletInfo.city}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 sm:gap-5">
                <button
                    onClick={() => navigate("/configure-outlets")}
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

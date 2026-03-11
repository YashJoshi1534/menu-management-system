import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FiLogOut, FiHome } from "react-icons/fi";
import { useEffect, useState } from "react";
import api from "../api/client";

export default function Navbar() {
    const { business, logout, selectedStoreUid, setSelectedStoreUid } = useAuth();
    const [storeInfo, setStoreInfo] = useState<any>(null);
    const navigate = useNavigate();

    useEffect(() => {
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
    }, [selectedStoreUid]);

    if (!business) return null;

    return (
        <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100/50 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center gap-6">
                <button
                    onClick={() => {
                        setSelectedStoreUid(null);
                        navigate("/dashboard");
                    }}
                    className="flex items-center gap-2 text-gray-700 hover:text-blue-600 font-bold transition-colors group"
                >
                    <div className="bg-blue-50 group-hover:bg-blue-100 p-2 rounded-xl transition-colors">
                        <FiHome className="text-xl text-blue-600" />
                    </div>
                    <span className="hidden sm:inline tracking-tight">Dashboard</span>
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
                            <span className="font-semibold text-gray-800 text-sm tracking-tight pr-2">{storeInfo.storeName}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-5">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-900 tracking-tight leading-tight">{business.name}</p>
                    <p className="text-xs text-gray-400 font-medium">{business.email}</p>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl font-semibold transition-all group"
                    title="Logout"
                >
                    <FiLogOut className="group-hover:-translate-x-1 transition-transform" />
                    <span className="hidden md:inline">Logout</span>
                </button>
            </div>
        </nav>
    );
}

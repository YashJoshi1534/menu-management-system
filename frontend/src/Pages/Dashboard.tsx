import { useState, useEffect } from "react";
import api from "../api/client";
import { FiPlayCircle, FiPlus, FiExternalLink, FiChevronRight } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
    const [loading, setLoading] = useState(false);
    const [stores, setStores] = useState<any[]>([]);
    const navigate = useNavigate();
    const { business, setSelectedStoreUid } = useAuth();

    useEffect(() => {
        if (!business) {
            navigate("/");
            return;
        }
        fetchStores();
    }, [business]);

    const fetchStores = async () => {
        try {
            const res = await api.get(`/businesses/${business?.businessId}/stores`);
            setStores(res.data);
        } catch (error) {
            toast.error("Failed to fetch stores");
        }
    };



    const startRequest = async (storeUid: string) => {
        setLoading(true);
        try {
            const res = await api.post(`/stores/${storeUid}/requests`);
            localStorage.setItem("requestId", res.data.requestId);
            setSelectedStoreUid(storeUid);
            toast.success("Request Started! 🚀");
            setTimeout(() => navigate("/menu-upload"), 800);
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Failed to start request");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 p-6 md:p-12">
            <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Welcome, {business?.name}</h1>
                        <p className="text-gray-500 mt-2 text-lg font-medium">Select a store to manage or create a new one.</p>
                    </div>
                    <button
                        onClick={() => navigate("/store-setup")}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl active:scale-95"
                    >
                        <FiPlus className="text-xl" /> <span className="tracking-tight">Add Store</span>
                    </button>
                </header>

                {stores.length === 0 ? (
                    <div className="bg-white/80 backdrop-blur-md p-16 rounded-3xl shadow-xl text-center border border-white relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                        <div className="bg-blue-50 group-hover:bg-blue-100 transition-colors w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner rotate-3 group-hover:rotate-6 duration-300">
                            <FiPlus className="text-4xl text-blue-600" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">No stores yet</h2>
                        <p className="text-gray-500 mb-10 max-w-md mx-auto text-lg leading-relaxed">
                            Add your first store to start managing your digital menus and generating AI dish images.
                        </p>
                        <button
                            onClick={() => navigate("/store-setup")}
                            className="bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl hover:shadow-2xl active:scale-95"
                        >
                            Setup Your First Store
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {stores.map((store, i) => (
                            <div
                                key={store.storeUid}
                                className="bg-white/80 backdrop-blur-md rounded-3xl shadow-lg hover:shadow-2xl border border-white overflow-hidden transition-all duration-300 group hover:-translate-y-1 relative"
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="p-8">
                                    <div className="flex items-center gap-5 mb-8">
                                        {store.logoUrl ? (
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-blue-500 blur-md opacity-20 group-hover:opacity-40 transition-opacity rounded-2xl"></div>
                                                <img
                                                    src={store.logoUrl}
                                                    alt={store.storeName}
                                                    className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-sm relative z-10"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center border-2 border-white shadow-sm relative z-10">
                                                <span className="text-indigo-600 font-bold text-2xl">{store.storeName?.charAt(0)}</span>
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-2xl font-extrabold text-gray-900 truncate tracking-tight">{store.storeName}</h3>
                                            <p className="text-sm text-gray-400 font-mono mt-1 opacity-70">
                                                ID: {store.storeUid.substring(0, 12)}...
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <button
                                            onClick={() => startRequest(store.storeUid)}
                                            disabled={loading}
                                            className="w-full flex items-center justify-between p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 group/btn"
                                        >
                                            <span className="flex items-center gap-3">
                                                <FiPlayCircle className="text-xl" />
                                                New Process
                                            </span>
                                            <FiChevronRight className="transform group-hover/btn:translate-x-1 transition-transform" />
                                        </button>

                                        <button
                                            onClick={() => {
                                                setSelectedStoreUid(store.storeUid);
                                                navigate(`/manage-menu/${store.storeUid}`);
                                            }}
                                            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-2xl font-bold transition-all border border-gray-100/50"
                                        >
                                            Manage Menu
                                            <div className="bg-white p-1 rounded-full shadow-sm">
                                                <FiChevronRight className="text-gray-400" />
                                            </div>
                                        </button>

                                        <a
                                            href={`/${store.storeUid}/menu`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 text-gray-500 hover:text-indigo-600 rounded-2xl font-bold border border-gray-200 transition-all group/link"
                                        >
                                            <span className="flex items-center gap-3">
                                                <FiExternalLink /> View Website
                                            </span>
                                            <FiChevronRight className="transform group-hover/link:translate-x-1 transition-transform opacity-0 group-hover/link:opacity-100" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

import React, { useState, useEffect } from "react";
import api from "../api/client";
import { FiShoppingBag, FiUploadCloud } from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function StoreSetup() {
    const [storeName, setStoreName] = useState("");
    const [logo, setLogo] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { business, setSelectedStoreUid } = useAuth();

    useEffect(() => {
        if (!business) {
            toast.error("Please login first");
            navigate("/");
        }
    }, [business, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!logo) return toast.error("Logo is required (1024x1024)");

        setLoading(true);

        const formData = new FormData();
        formData.append("storeName", storeName);
        formData.append("logo", logo);

        try {
            const res = await api.post(`/businesses/${business?.businessId}/stores`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            toast.success("Store created! 🎉");
            setSelectedStoreUid(res.data.storeUid);
            setTimeout(() => navigate("/dashboard"), 1000);
        } catch (error: any) {
            console.error(error);
            toast.error(error?.response?.data?.detail || "Store creation failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex justify-center items-center px-4 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-3xl"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/10 blur-3xl"></div>
            </div>

            <div className="bg-white/80 backdrop-blur-md w-full max-w-md rounded-3xl shadow-xl p-10 z-10 border border-white relative animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-8">
                    <div className="bg-blue-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/30">
                        <FiShoppingBag className="text-2xl" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Store Setup</h2>
                    <p className="text-gray-500 mt-2 text-sm font-medium">Create your first digital storefront</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-5">
                        <div className="relative group">
                            <FiShoppingBag className="absolute left-4 top-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Store Name"
                                required
                                className="w-full pl-12 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                onChange={(e) => setStoreName(e.target.value)}
                            />
                        </div>

                        <label className={`flex flex-col items-center justify-center border-2 border-dashed ${logo ? 'border-green-400 bg-green-50' : 'border-blue-200 hover:border-blue-400 bg-blue-50/50 hover:bg-blue-50'} rounded-2xl p-8 cursor-pointer transition-all group`}>
                            <FiUploadCloud className={`text-4xl mb-3 transition-colors ${logo ? 'text-green-500' : 'text-blue-400 group-hover:text-blue-600 group-hover:-translate-y-1'}`} />
                            <span className={`text-sm font-semibold ${logo ? 'text-green-700' : 'text-blue-600'}`}>
                                {logo ? 'Logo Selected' : 'Upload Store Logo'}
                            </span>
                            <span className="text-xs text-gray-400 mt-1 font-medium">1024x1024 recommended</span>
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => e.target.files && setLogo(e.target.files[0])}
                            />
                            {logo && <p className="text-xs text-green-600 mt-3 font-medium bg-green-100 px-3 py-1 rounded-full truncate max-w-[200px]">{logo.name}</p>}
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-bold text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-70 flex items-center justify-center gap-2 active:scale-95"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            "Create Store & Continue"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

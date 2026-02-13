import React, { useState, useEffect } from "react";
import api from "../api/client";
import { FiShoppingBag, FiUploadCloud } from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function StoreSetup() {
    const [storeName, setStoreName] = useState("");
    const [logo, setLogo] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!localStorage.getItem("contactId")) {
            toast.error("Please register contact first");
            navigate("/");
        }
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!logo) return toast.error("Logo is required (1024x1024)");

        setLoading(true);
        const contactId = localStorage.getItem("contactId");

        const formData = new FormData();
        formData.append("storeName", storeName);
        formData.append("logo", logo);

        try {
            const res = await api.post(`/contacts/${contactId}/stores`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            toast.success("Store created! 🎉");
            localStorage.setItem("storeUid", res.data.storeUid);
            setTimeout(() => navigate("/dashboard"), 1000);
        } catch (error: any) {
            console.error(error);
            toast.error(error?.response?.data?.detail || "Store creation failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex justify-center items-center px-4">
            <form onSubmit={handleSubmit} className="bg-white w-full max-w-md rounded-xl shadow-xl p-8">
                <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Store Setup</h2>

                <div className="space-y-5">
                    <div className="relative">
                        <FiShoppingBag className="absolute left-3 top-3.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Store Name"
                            required
                            className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            onChange={(e) => setStoreName(e.target.value)}
                        />
                    </div>

                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-300 rounded-lg p-6 cursor-pointer hover:bg-indigo-50 transition">
                        <FiUploadCloud className="text-3xl text-indigo-600 mb-2" />
                        <span className="text-sm text-gray-600">Upload Logo (1024x1024)</span>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => e.target.files && setLogo(e.target.files[0])}
                        />
                        {logo && <p className="text-xs text-green-600 mt-2">{logo.name}</p>}
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                    {loading ? "Creating Store..." : "Next: Dashboard"}
                </button>
            </form>
        </div>
    );
}

import React, { useState, useEffect } from "react";
import api from "../api/client";
import { FiPlayCircle, FiMoreHorizontal } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function Dashboard() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [storeUid, setStoreUid] = useState<string | null>(null);

    useEffect(() => {
        const uid = localStorage.getItem("storeUid");
        if (!uid) {
            toast.error("No store found");
            navigate("/");
        }
        setStoreUid(uid);
    }, []);

    const startRequest = async () => {
        setLoading(true);
        try {
            const res = await api.post(`/stores/${storeUid}/requests`);
            localStorage.setItem("requestId", res.data.requestId);
            toast.success("Request Started! 🚀");
            setTimeout(() => navigate("/menu-upload"), 800);
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Failed to start request");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
            <div className="bg-white p-10 rounded-2xl shadow-xl text-center max-w-lg w-full">
                <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FiPlayCircle className="text-4xl text-blue-600" />
                </div>

                <h2 className="text-3xl font-bold text-gray-800 mb-2">Ready to Process?</h2>
                <p className="text-gray-500 mb-8">
                    Start a new menu extraction request for your store.
                </p>

                <button
                    onClick={startRequest}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                    {loading ? "Initializing..." : "Start New Request"}
                </button>
            </div>
        </div>
    );
}

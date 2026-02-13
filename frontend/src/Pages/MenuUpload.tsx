import React, { useState, useEffect } from "react";
import api from "../api/client";
import { FiUploadCloud, FiCpu } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function MenuUpload() {
    const [images, setImages] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [requestId, setRequestId] = useState<string | null>(null);

    useEffect(() => {
        const id = localStorage.getItem("requestId");
        if (!id) {
            navigate("/dashboard");
        }
        setRequestId(id);
    }, [navigate]);

    const handleUpload = async () => {
        if (images.length === 0) return toast.error("Select images first!");

        setLoading(true);
        const formData = new FormData();
        images.forEach((file) => formData.append("images", file));

        try {
            const res = await api.post(`/requests/${requestId}/menu-images`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            toast.success(`Extracted ${res.data.totalDishes} dishes! 🍲`);
            setTimeout(() => navigate("/dish-generation"), 1000);
        } catch (error: any) {
            toast.error("Extraction Failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white max-w-2xl w-full p-8 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-gray-800">Upload Menu Images</h2>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">Step 2 of 3</span>
                </div>

                <label className="flex flex-col items-center justify-center border-3 border-dashed border-gray-300 rounded-xl p-10 cursor-pointer hover:bg-gray-50 transition min-h-[300px]">
                    <FiUploadCloud className="text-5xl text-gray-400 mb-4" />
                    <span className="text-xl font-medium text-gray-600">Drag & Drop or Click to Upload</span>
                    <span className="text-sm text-gray-400 mt-2">JPG, PNG, WEBP</span>
                    <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => e.target.files && setImages(Array.from(e.target.files))}
                    />
                </label>

                {images.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-2">
                        {images.map((img, i) => (
                            <div key={i} className="bg-gray-100 px-3 py-1 rounded text-sm text-gray-600 truncate max-w-[150px]">
                                {img.name}
                            </div>
                        ))}
                    </div>
                )}

                <button
                    onClick={handleUpload}
                    disabled={loading || images.length === 0}
                    className="w-full mt-8 bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? <><FiCpu className="animate-spin" /> Processing AI...</> : "Extract Menu Data"}
                </button>
            </div>
        </div>
    );
}

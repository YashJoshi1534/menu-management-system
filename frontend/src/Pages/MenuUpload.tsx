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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-3xl"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/10 blur-3xl"></div>
            </div>

            <div className="bg-white/80 backdrop-blur-md max-w-2xl w-full p-10 rounded-3xl shadow-xl z-10 border border-white relative animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Upload Menu</h2>
                        <p className="text-gray-500 mt-1 text-sm font-medium">We'll transcribe it using AI</p>
                    </div>
                    <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">Step 2 of 3</span>
                </div>

                <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/50 hover:bg-blue-50 rounded-3xl p-12 cursor-pointer transition-all min-h-[300px] group">
                    <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 group-hover:-translate-y-2 transition-transform duration-300">
                        <FiUploadCloud className="text-5xl text-blue-500" />
                    </div>
                    <span className="text-xl font-bold text-gray-800 tracking-tight">Drag & Drop Menu Images</span>
                    <span className="text-sm text-gray-400 mt-2 font-medium">Supports JPG, PNG, WEBP</span>
                    <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => e.target.files && setImages(Array.from(e.target.files))}
                    />
                </label>

                {images.length > 0 && (
                    <div className="mt-8">
                        <h4 className="text-sm font-bold text-gray-700 mb-3">Selected Files ({images.length})</h4>
                        <div className="flex flex-wrap gap-2">
                            {images.map((img, i) => (
                                <div key={i} className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl text-sm font-medium text-indigo-700 truncate max-w-[200px] shadow-sm animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 50}ms` }}>
                                    {img.name}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleUpload}
                    disabled={loading || images.length === 0}
                    className="w-full mt-10 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-bold text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
                >
                    {loading ? (
                        <>
                            <FiCpu className="animate-spin text-xl" /> 
                            <span>Transcribing Menu...</span>
                        </>
                    ) : (
                        <>
                            <span>Extract Menu Data</span>
                            <FiCpu className="text-xl opacity-70" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

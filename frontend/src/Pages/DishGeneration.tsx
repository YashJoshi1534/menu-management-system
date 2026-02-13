import React, { useState, useEffect } from "react";
import api from "../api/client";
import { FiImage, FiChevronLeft, FiChevronRight, FiCheckCircle, FiLoader, FiEdit2, FiSave, FiVideo, FiRefreshCw } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

interface Dish {
    dishId: string;
    name: string;
    price: number | null;
    weight: string | null;
    description: string | null;
    imageUrl: string | null;
    imageStatus: "pending" | "generating" | "ready" | "failed";
}

export default function DishGeneration() {
    const [dish, setDish] = useState<Dish | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [generateAllProgress, setGenerateAllProgress] = useState(0);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const navigate = useNavigate();
    const [requestId, setRequestId] = useState<string | null>(null);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", price: "", weight: "", description: "" });

    useEffect(() => {
        const id = localStorage.getItem("requestId");
        if (!id) {
            navigate("/");
            return;
        }
        setRequestId(id);
        fetchDish(id, 1);
    }, []);

    const fetchDish = async (reqId: string, p: number) => {
        setLoading(true);
        setIsEditing(false);
        try {
            const res = await api.get(`/requests/${reqId}/dishes?page=${p}&limit=1`);
            setDish(res.data.dish);
            setTotalPages(res.data.totalPages);
            setPage(res.data.page);
            // Initialize form
            if (res.data.dish) {
                setEditForm({
                    name: res.data.dish.name,
                    price: res.data.dish.price?.toString() || "",
                    weight: res.data.dish.weight || "",
                    description: res.data.dish.description || ""
                });
            }
        } catch (e) {
            toast.error("Failed to load dish");
        } finally {
            setLoading(false);
        }
    };

    const generateImage = async () => {
        if (!dish || !requestId) return;
        setGenerating(true);
        setDish({ ...dish, imageStatus: "generating" });

        try {
            const res = await api.post(`/requests/${requestId}/generate-image/${dish.dishId}`);
            setDish({ ...dish, imageUrl: res.data.imageUrl, imageStatus: "ready" });
            toast.success("Image Generated! 🎨");
        } catch (e) {
            setDish({ ...dish, imageStatus: "failed" });
            toast.error("Generation Failed");
        } finally {
            setGenerating(false);
        }
    };

    const handleGenerateAll = async () => {
        if (!requestId) return;
        setIsGeneratingAll(true);
        setGenerateAllProgress(0);

        try {
            // 1. Fetch ALL dishes to get IDs
            const allRes = await api.get(`/requests/${requestId}/dishes?limit=1000`);
            const allDishes: Dish[] = allRes.data.dish ? [allRes.data.dish] : [];
            // NOTE: The backend currently returns 'dish' as single obj if limit=1, 
            // but we need a list if limit > 1. 
            // I need to patch the backend to return 'dishes' list in the response properly.
            // Assuming backend patch (checked previously, it returns a list but field name was 'dish' in code?)
            // Let's re-read backend: "dish": dish_obj. It ONLY returns one. 
            // *** CRITICAL FIX IN FRONTEND WORKAROUND OR BACKEND FIX ***
            // I will fix the backend to return 'dishes' list in next step or use pagination loop here.
            // For now, I will assume I need to loop pages.

            let generatedCount = 0;
            for (let p = 1; p <= totalPages; p++) {
                // Fetch page
                const pRes = await api.get(`/requests/${requestId}/dishes?page=${p}&limit=1`);
                const d = pRes.data.dish;
                if (d && d.imageStatus !== 'ready') {
                    // Generate
                    await api.post(`/requests/${requestId}/generate-image/${d.dishId}`);
                }
                generatedCount++;
                setGenerateAllProgress(Math.round((generatedCount / totalPages) * 100));
            }
            toast.success("All Images Generated!");
            // Refresh current view
            fetchDish(requestId, page);

        } catch (e) {
            toast.error("Bulk generation stopped");
        } finally {
            setIsGeneratingAll(false);
        }
    };

    const saveEdit = async () => {
        if (!dish || !requestId) return;
        try {
            await api.put(`/dishes/${dish.dishId}`, editForm);
            setDish({
                ...dish,
                name: editForm.name,
                price: parseFloat(editForm.price),
                weight: editForm.weight,
                description: editForm.description
            });
            setIsEditing(false);
            toast.success("Saved!");
        } catch (e) {
            toast.error("Failed to save");
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">

            {/* Top Bar for Bulk Actions */}
            <div className="w-full max-w-4xl flex justify-between items-center mb-6">
                <div className="flex gap-4 w-full">
                    <div className="flex gap-4 w-full">
                        {isGeneratingAll ? (
                            <div className="flex-1 bg-white rounded-xl p-4 shadow flex items-center gap-4">
                                <FiLoader className="animate-spin text-blue-600" />
                                <div className="flex-1">
                                    <div className="text-sm font-semibold mb-1">Generating All Images... {generateAllProgress}%</div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${generateAllProgress}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={handleGenerateAll}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                                >
                                    ✨ Generate All
                                </button>
                                <button
                                    onClick={() => navigate("/completion")}
                                    className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"
                                >
                                    🚀 View Website
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                {/* Left: Image Preview */}
                <div className="w-full md:w-1/2 bg-gray-900 flex items-center justify-center relative p-6">
                    {loading ? (
                        <div className="text-white">Loading...</div>
                    ) : dish?.imageUrl ? (
                        <img src={dish.imageUrl} className="w-full h-full object-contain rounded-lg shadow-2xl" alt={dish.name} />
                    ) : (
                        <div className="text-gray-500 flex flex-col items-center">
                            <FiImage className="text-6xl mb-4" />
                            <p>No Image Generated</p>
                            {dish?.imageStatus === "generating" && <p className="text-blue-400 mt-2 animate-pulse">Generating AI Image...</p>}
                        </div>
                    )}
                </div>

                {/* Right: Controls */}
                <div className="w-full md:w-1/2 p-8 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-sm text-gray-500 font-mono">DISH {page} / {totalPages}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide 
                        ${dish?.imageStatus === 'ready' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {dish?.imageStatus}
                            </span>
                        </div>

                        {/* Editable Fields */}
                        {isEditing ? (
                            <div className="space-y-3 mb-6">
                                <input
                                    className="w-full border p-2 rounded text-xl font-bold"
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    placeholder="Dish Name"
                                />
                                <div className="flex gap-2">
                                    <input
                                        className="w-1/2 border p-2 rounded"
                                        value={editForm.price}
                                        type="number"
                                        onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                                        placeholder="Price ($)"
                                    />
                                    <input
                                        className="w-1/2 border p-2 rounded"
                                        value={editForm.weight}
                                        onChange={e => setEditForm({ ...editForm, weight: e.target.value })}
                                        placeholder="Weight (e.g. 200g)"
                                    />
                                </div>
                                <textarea
                                    className="w-full border p-2 rounded h-20 text-sm"
                                    value={editForm.description}
                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    placeholder="Description"
                                />
                                <div className="flex gap-2">
                                    <button onClick={saveEdit} className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"><FiSave /> Save</button>
                                    <button onClick={() => setIsEditing(false)} className="bg-gray-300 text-gray-700 px-4 py-2 rounded">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-6 relative group">
                                <button onClick={() => setIsEditing(true)} className="absolute -right-2 -top-2 p-2 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition">
                                    <FiEdit2 />
                                </button>
                                <h1 className="text-3xl font-bold text-gray-800 mb-2 leading-tight">{dish?.name || "Loading..."}</h1>
                                <div className="flex gap-4 items-baseline">
                                    <p className="text-2xl text-blue-600 font-bold">${dish?.price || "N/A"}</p>
                                    {dish?.weight && <span className="text-gray-500 text-sm">{dish.weight}</span>}
                                </div>
                                {dish?.description && <p className="text-gray-600 mt-2 text-sm">{dish.description}</p>}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            {/* Main Generate/Regenerate Button */}
                            <button
                                onClick={generateImage}
                                disabled={generating || isGeneratingAll}
                                className={`col-span-${dish?.imageStatus === 'ready' ? '1' : '2'} py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition shadow-md
                                ${dish?.imageStatus === 'ready'
                                        ? 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                            >
                                {dish?.imageStatus === 'generating' ? <FiLoader className="animate-spin" /> :
                                    dish?.imageStatus === 'ready' ? <><FiRefreshCw /> Regenerate</> : "✨ Generate"}
                            </button>

                            {/* Create Video Button (Placeholder) */}
                            {dish?.imageStatus === 'ready' && (
                                <button className="col-span-1 bg-pink-100 text-pink-700 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-pink-200 transition">
                                    <FiVideo /> Video
                                </button>
                            )}
                        </div>

                        {/* Navigation */}
                        <div className="flex gap-4">
                            {requestId && (
                                <>
                                    <button
                                        onClick={() => fetchDish(requestId, page - 1)}
                                        disabled={page <= 1}
                                        className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center"
                                    >
                                        <FiChevronLeft />
                                    </button>
                                    <button
                                        onClick={() => fetchDish(requestId, page + 1)}
                                        disabled={page >= totalPages}
                                        className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center"
                                    >
                                        <FiChevronRight />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

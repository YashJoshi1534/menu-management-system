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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-3xl"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/10 blur-3xl"></div>
            </div>

            {/* Top Bar for Bulk Actions */}
            <div className="w-full max-w-5xl flex justify-between items-center mb-6 z-10 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex gap-4 w-full">
                    {isGeneratingAll ? (
                        <div className="flex-1 bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-lg border border-white flex items-center gap-5">
                            <div className="bg-blue-100 p-3 rounded-xl">
                                <FiLoader className="animate-spin text-2xl text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-bold text-gray-800 mb-2 flex justify-between">
                                    <span>Generating All Images...</span>
                                    <span className="text-blue-600">{generateAllProgress}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-300 relative" style={{ width: `${generateAllProgress}%` }}>
                                        <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-4 w-full">
                            <button
                                onClick={handleGenerateAll}
                                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 border border-purple-500/30"
                            >
                                <span className="text-xl">✨</span> 
                                <span className="tracking-tight">Generate All Images</span>
                            </button>
                            <button
                                onClick={() => navigate("/completion")}
                                className="bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-3 active:scale-95"
                            >
                                <span className="tracking-tight">Finish</span>
                                <FiChevronRight className="text-xl" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full max-w-5xl bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white overflow-hidden flex flex-col md:flex-row min-h-[600px] z-10 animate-in fade-in zoom-in-95 duration-500 relative">
                
                {/* Status Badge Absolute */}
                <div className="absolute top-6 left-6 z-20">
                    <span className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2
                        ${dish?.imageStatus === 'ready' ? 'bg-green-500 text-white' : 
                          dish?.imageStatus === 'generating' ? 'bg-blue-500 text-white animate-pulse' : 
                          'bg-amber-500 text-white'}`}>
                        {dish?.imageStatus === 'ready' && <FiCheckCircle/>}
                        {dish?.imageStatus === 'generating' && <FiLoader className="animate-spin"/>}
                        {dish?.imageStatus}
                    </span>
                </div>

                {/* Left: Image Preview */}
                <div className="w-full md:w-1/2 bg-gray-950 flex flex-col items-center justify-center relative p-8 overflow-hidden group">
                    {/* Subtle grid pattern background */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                    
                    {loading ? (
                        <div className="flex flex-col items-center gap-4 text-white">
                            <FiLoader className="text-4xl animate-spin text-blue-500" />
                            <span className="font-medium tracking-widest text-sm uppercase text-gray-400">Loading Dish...</span>
                        </div>
                    ) : dish?.imageUrl ? (
                        <img src={dish.imageUrl} className="w-full h-full object-contain drop-shadow-2xl z-10 transition-transform duration-700 group-hover:scale-105" alt={dish.name} />
                    ) : (
                        <div className="text-gray-500 flex flex-col items-center z-10 bg-gray-900/50 p-10 rounded-3xl backdrop-blur-sm border border-gray-800">
                            <FiImage className="text-6xl mb-6 text-gray-700" />
                            <p className="font-medium text-lg">No Image Generated</p>
                            {dish?.imageStatus === "generating" && <p className="text-blue-400 mt-3 animate-pulse font-bold tracking-widest uppercase text-sm">Generating AI Image...</p>}
                        </div>
                    )}
                </div>

                {/* Right: Controls */}
                <div className="w-full md:w-1/2 p-10 flex flex-col justify-between bg-white/50">
                    <div>
                        <div className="flex justify-end items-center mb-8">
                            <span className="text-sm font-bold text-gray-400 bg-gray-100 px-4 py-1.5 rounded-full tracking-widest uppercase">
                                Dish {page} of {totalPages}
                            </span>
                        </div>

                        {/* Editable Fields */}
                        {isEditing ? (
                            <div className="space-y-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-2">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Name</label>
                                    <input
                                        className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-lg font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editForm.name}
                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                        placeholder="Dish Name"
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-1/2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Price</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3.5 text-gray-500 font-bold">$</span>
                                            <input
                                                className="w-full bg-gray-50 border border-gray-200 pl-8 p-3 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={editForm.price}
                                                type="number"
                                                onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div className="w-1/2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Weight/Qty</label>
                                        <input
                                            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editForm.weight}
                                            onChange={e => setEditForm({ ...editForm, weight: e.target.value })}
                                            placeholder="e.g. 200g"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Description</label>
                                    <textarea
                                        className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm min-h-[100px] focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                                        value={editForm.description}
                                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                        placeholder="Description..."
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={saveEdit} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 flex-1 font-bold shadow-md transition-all active:scale-95">
                                        <FiSave /> Save
                                    </button>
                                    <button onClick={() => setIsEditing(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-xl font-bold flex-1 transition-all active:scale-95">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-8 relative group animate-in fade-in">
                                <button 
                                    onClick={() => setIsEditing(true)} 
                                    className="absolute -right-4 -top-4 p-3 bg-white shadow-md rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 active:scale-95"
                                    title="Edit Details"
                                >
                                    <FiEdit2 className="text-xl" />
                                </button>
                                <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight tracking-tight">{dish?.name || "Loading..."}</h1>
                                <div className="flex gap-4 items-center bg-gray-100/50 w-fit px-4 py-2 rounded-2xl mb-4">
                                    <p className="text-3xl text-blue-600 font-black tracking-tight">${dish?.price || "N/A"}</p>
                                    {dish?.weight && (
                                        <>
                                            <div className="w-1 h-6 bg-gray-300 rounded-full"></div>
                                            <span className="text-gray-500 font-bold">{dish.weight}</span>
                                        </>
                                    )}
                                </div>
                                {dish?.description && (
                                    <p className="text-gray-600 text-base leading-relaxed max-w-md">{dish.description}</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Main Generate/Regenerate Button */}
                            <button
                                onClick={generateImage}
                                disabled={generating || isGeneratingAll}
                                className={`col-span-${dish?.imageStatus === 'ready' ? '1' : '2'} py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100
                                ${dish?.imageStatus === 'ready'
                                        ? 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                            >
                                {dish?.imageStatus === 'generating' ? <><FiLoader className="animate-spin text-xl" /> Processing...</> :
                                    dish?.imageStatus === 'ready' ? <><FiRefreshCw className="text-xl" /> Regenerate</> : <><span className="text-xl">✨</span> Generate Image</>}
                            </button>

                            {/* Create Video Button (Placeholder) */}
                            {dish?.imageStatus === 'ready' && (
                                <button className="col-span-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95">
                                    <FiVideo className="text-xl" /> Create Video
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
                                        className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 text-gray-700 font-bold shadow-sm disabled:opacity-40 disabled:hover:bg-white flex items-center justify-center gap-2 transition-all active:scale-95"
                                    >
                                        <FiChevronLeft className="text-xl" /> Previous
                                    </button>
                                    <button
                                        onClick={() => fetchDish(requestId, page + 1)}
                                        disabled={page >= totalPages}
                                        className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 text-gray-700 font-bold shadow-sm disabled:opacity-40 disabled:hover:bg-white flex items-center justify-center gap-2 transition-all active:scale-95"
                                    >
                                        Next <FiChevronRight className="text-xl" />
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

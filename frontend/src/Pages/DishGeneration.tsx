import { FiImage, FiChevronRight, FiLoader, FiEdit2, FiRefreshCw, FiZap } from "react-icons/fi";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/client";

interface Dish {
    dishId: string;
    name: string;
    price: number | null;
    weight: string | null;
    description: string | null;
    imageUrl: string | null;
    imageStatus: "pending" | "generating" | "ready" | "failed";
    generationCount?: number;
}

import ProgressBar from "../components/ProgressBar";

export default function DishGeneration() {
    const [dish, setDish] = useState<Dish | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [generateAllProgress, setGenerateAllProgress] = useState(0);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [generationLimit, setGenerationLimit] = useState(1);
    const [storeCurrency, setStoreCurrency] = useState("₹");
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
            setGenerationLimit(res.data.generationLimit || 1);
            setStoreCurrency(res.data.storeCurrency || "₹");
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
            setDish({ ...dish, imageUrl: res.data.imageUrl, imageStatus: "ready", generationCount: (dish.generationCount || 0) + 1 });
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
            let generatedCount = 0;
            for (let p = 1; p <= totalPages; p++) {
                const pRes = await api.get(`/requests/${requestId}/dishes?page=${p}&limit=1`);
                const d = pRes.data.dish;
                const limit = pRes.data.generationLimit || 1;
                
                if (d && d.imageStatus !== 'ready' && (d.generationCount || 0) < limit) {
                    await api.post(`/requests/${requestId}/generate-image/${d.dishId}`);
                }
                generatedCount++;
                setGenerateAllProgress(Math.round((generatedCount / totalPages) * 100));
            }
            toast.success("All Images Generated!");
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
        <div className="h-[calc(100vh-76px)] bg-white flex flex-col items-center p-4 md:p-6 relative overflow-hidden animate-in fade-in duration-700">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none fixed z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[120px]"></div>
            </div>

            <div className="w-full z-10 flex flex-col gap-6 h-full min-h-0 overflow-hidden">
                <ProgressBar currentStep={3} />
                
                <div className="flex flex-col lg:flex-row-reverse gap-8 h-full min-h-0">
                    {/* Right / Swapped: View Controls */}
                    <div className="w-full lg:w-1/3 flex flex-col gap-6 min-h-0">
                        {/* Pagination */}
                        <div className="bg-white border-2 border-gray-50 p-8 rounded-[2.5rem] flex items-center justify-between shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-4xl font-[1000] text-gray-900 leading-none">{page} / {totalPages}</span>
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest mt-2">Dishes</span>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => fetchDish(requestId!, page - 1)}
                                    disabled={page <= 1}
                                    className="w-14 h-14 bg-gray-50 hover:bg-gray-100 border-2 border-gray-100 rounded-2xl flex items-center justify-center transition-all disabled:opacity-20 active:scale-90"
                                >
                                    <FiChevronRight className="rotate-180 text-xl" />
                                </button>
                                <button
                                    onClick={() => fetchDish(requestId!, page + 1)}
                                    disabled={page >= totalPages}
                                    className="w-14 h-14 bg-gray-50 hover:bg-gray-100 border-2 border-gray-100 rounded-2xl flex items-center justify-center transition-all disabled:opacity-20 active:scale-90"
                                >
                                    <FiChevronRight className="text-xl" />
                                </button>
                            </div>
                        </div>

                        <div className="bg-gray-50/50 border-2 border-gray-100/50 rounded-[2.5rem] p-8 space-y-8 shadow-inner">
                            <div className="space-y-4">
                                <h2 className="text-3xl md:text-4xl font-[1000] text-gray-900 tracking-tighter leading-none">Dish Gallery</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-40">Step 3 of 4 • AI Generation</p>
                            </div>

                            <div className="space-y-6">
                                {isGeneratingAll ? (
                                    <div className="bg-blue-600 rounded-[2rem] p-8 shadow-xl animate-pulse">
                                        <div className="flex items-center gap-4 mb-6">
                                            <FiLoader className="animate-spin text-3xl text-white" />
                                            <span className="text-white font-[1000] text-xl tracking-tight">AI Generating...</span>
                                        </div>
                                        <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                                            <div className="bg-white h-full transition-all duration-500" style={{ width: `${generateAllProgress}%` }}></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        <button
                                            onClick={handleGenerateAll}
                                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-6 rounded-[2rem] font-[1000] text-xl flex items-center justify-center gap-4 active:scale-[0.98] shadow-lg shadow-blue-500/20"
                                        >
                                            <FiZap className="text-2xl" /> GENERATE ALL
                                        </button>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await api.post(`/requests/${requestId}/publish`);
                                                    navigate("/completion");
                                                } catch (e: any) {
                                                    toast.error("Failed to publish menu");
                                                }
                                            }}
                                            className="w-full bg-gray-900 hover:bg-black text-white py-6 rounded-[2rem] font-[1000] text-xl flex items-center justify-center gap-4 active:scale-[0.98] shadow-lg shadow-black/20"
                                        >
                                            FINISH <FiChevronRight />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Left / Swapped: Display Area */}
                    <div className="w-full lg:w-2/3 bg-white border-2 border-gray-50 rounded-[3rem] shadow-2xl flex flex-col md:flex-row min-h-0 overflow-hidden transition-all duration-700 hover:shadow-3xl hover:border-gray-100">
                        {/* Image Preview */}
                        <div className="w-full md:w-5/12 bg-gray-950 relative flex items-center justify-center min-h-[250px] md:min-h-0">
                            {loading ? (
                                <FiLoader className="text-5xl animate-spin text-blue-500 opacity-50" />
                            ) : dish?.imageUrl ? (
                                <img src={dish.imageUrl} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="flex flex-col items-center gap-6 opacity-20">
                                    <FiImage className="text-8xl text-white" />
                                    <span className="text-white font-[1000] text-xs uppercase tracking-widest">No Image</span>
                                </div>
                            )}
                            
                            <div className="absolute top-6 left-6 z-10">
                                <span className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 backdrop-blur-md border border-white/20 text-white
                                    ${dish?.imageStatus === 'ready' ? 'bg-green-500/90' : 
                                    dish?.imageStatus === 'generating' ? 'bg-blue-500/90' : 
                                    'bg-amber-500/90'}`}>
                                    <div className={`w-2 h-2 rounded-full ${dish?.imageStatus === 'ready' ? 'bg-green-200' : 'bg-white anime-pulse'}`}></div>
                                    {dish?.imageStatus}
                                </span>
                            </div>
                        </div>

                        {/* Content & Edit */}
                        <div className="w-full md:w-7/12 p-6 md:p-8 flex flex-col justify-between overflow-y-auto custom-scrollbar h-full bg-white relative">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-300 border border-gray-50 px-4 py-2 rounded-full tracking-[0.2em] uppercase">Dish Identity</span>
                                    {!isEditing && (
                                        <button onClick={() => setIsEditing(true)} className="w-10 h-10 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-xl flex items-center justify-center border border-gray-100 active:scale-95 transition-all">
                                            <FiEdit2 size={18} />
                                        </button>
                                    )}
                                </div>

                                {isEditing ? (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                                        <input
                                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 p-3 rounded-xl text-lg font-[1000] outline-none shadow-inner"
                                            value={editForm.name}
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <input
                                                className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 p-3 rounded-xl font-black outline-none text-sm shadow-inner"
                                                value={editForm.price}
                                                type="number"
                                                onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                                            />
                                            <input
                                                className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 p-3 rounded-xl font-black outline-none text-sm shadow-inner"
                                                value={editForm.weight}
                                                onChange={e => setEditForm({ ...editForm, weight: e.target.value })}
                                            />
                                        </div>
                                        <textarea
                                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 p-3 rounded-xl text-xs min-h-[70px] outline-none font-bold text-gray-600 resize-none shadow-inner custom-scrollbar"
                                            value={editForm.description}
                                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                        />
                                        <div className="flex gap-3">
                                            <button onClick={saveEdit} className="bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-[1000] flex-1 active:scale-95 transition-all shadow-lg shadow-green-500/20">SAVE</button>
                                            <button onClick={() => setIsEditing(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-[1000] flex-1 active:scale-95 transition-all">CANCEL</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-in zoom-in-95 duration-500">
                                        <h1 className="text-2xl lg:text-3xl font-[1000] text-gray-900 tracking-tighter leading-tight transition-all">{dish?.name || "..."}</h1>
                                        <div className="flex gap-3 items-center text-xl lg:text-2xl text-blue-600 font-[1000] tracking-tighter">
                                            <span>{storeCurrency}{dish?.price || "0"}</span>
                                            {dish?.weight && <span className="text-gray-400 text-base font-bold">/ {dish?.weight}</span>}
                                        </div>
                                        <p className="text-gray-500 text-base leading-relaxed font-medium line-clamp-4 italic opacity-80">"{dish?.description}"</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4">
                                {(dish?.generationCount || 0) < generationLimit ? (
                                    <button
                                        onClick={generateImage}
                                        disabled={generating || isGeneratingAll}
                                        className={`w-full py-5 rounded-[1.5rem] font-[1000] text-xl transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-4 ${
                                            dish?.imageStatus === 'ready' 
                                            ? 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50' 
                                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                                        }`}
                                    >
                                        {generating ? <FiLoader className="animate-spin text-2xl" /> : dish?.imageStatus === 'ready' ? <><FiRefreshCw className="text-2xl" /> RE-GENERATE</> : <><FiZap className="text-2xl" /> GENERATE IMAGE</>}
                                    </button>
                                ) : (
                                    <div className="w-full py-5 rounded-[1.5rem] bg-gray-50 text-gray-400 font-[1000] text-xl flex items-center justify-center gap-4 border-2 border-gray-100 uppercase tracking-widest shadow-inner">
                                        Limit Reached
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

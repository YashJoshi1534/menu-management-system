import { FiImage, FiChevronRight, FiLoader, FiEdit2, FiX, FiPlus } from "react-icons/fi";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import ProgressBar from "../components/ProgressBar";

interface Variant {
    variantType?: string;
    label: string;
    price: number;
}

interface Dish {
    dishId: string;
    name: string;
    price: number | null;
    weight: string | null;
    description: string | null;
    imageUrl: string | null;
    imageStatus: "pending" | "generating" | "ready" | "failed";
    generationCount?: number;
    categoryName?: string;
    variants: Variant[];
}

export default function DishGeneration() {
    const [dish, setDish] = useState<Dish | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [generationLimit, setGenerationLimit] = useState(1);
    const [outletCurrency, setOutletCurrency] = useState("₹");
    const navigate = useNavigate();
    const [requestId, setRequestId] = useState<string | null>(null);
    const [outletName, setOutletName] = useState<string>("");
    const { selectedOutletUid, business } = useAuth();

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ 
        name: "", 
        price: "", 
        weight: "", 
        description: "", 
        categoryName: "",
        variants: [] as Variant[]
    });

    useEffect(() => {
        const id = localStorage.getItem("requestId");
        if (!id) {
            navigate("/");
            return;
        }
        setRequestId(id);
        fetchDish(id, 1);

        if (selectedOutletUid) {
            api.get(`/outlets/${selectedOutletUid}/menu`)
                .then(res => {
                    if (res.data?.outlet?.storeName) setOutletName(res.data.outlet.storeName);
                })
                .catch(err => console.error("Failed to fetch outlet name", err));
        }
    }, [navigate, selectedOutletUid, business]);

    const fetchDish = async (reqId: string, p: number) => {
        setLoading(true);
        setIsEditing(false);
        try {
            const res = await api.get(`/requests/${reqId}/dishes?page=${p}&limit=1`);
            setDish(res.data.dish);
            setTotalPages(res.data.totalPages);
            setPage(res.data.page);
            setGenerationLimit(res.data.generationLimit || 1);
            setOutletCurrency(res.data.outletCurrency || "₹");
            if (res.data.dish) {
                setEditForm({
                    name: res.data.dish.name,
                    price: res.data.dish.price?.toString() || "",
                    weight: res.data.dish.weight || "",
                    description: res.data.dish.description || "",
                    categoryName: res.data.dish.categoryName || "",
                    variants: res.data.dish.variants || []
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

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);

    const confirmDelete = async () => {
        if (!dish || !requestId) return;
        try {
            await api.delete(`/dishes/${dish.dishId}`);
            toast.success("Dish deleted");
            setShowDeleteModal(false);
            fetchDish(requestId, page);
        } catch (e) {
            toast.error("Failed to delete");
        }
    };

    const handleReset = async () => {
        if (!selectedOutletUid) {
            localStorage.removeItem("requestId");
            navigate("/");
            return;
        }

        try {
            if (requestId && !requestId.startsWith('temp_')) {
                await api.delete(`/requests/${requestId}`);
            }

            const res = await api.post(`/outlets/${selectedOutletUid}/requests`);
            if (res.data.requestId) {
                localStorage.setItem("requestId", res.data.requestId);
                navigate("/menu-upload");
            } else {
                navigate("/");
            }
        } catch (e) {
            toast.error("Failed to restart process");
            navigate("/");
        } finally {
            setShowResetModal(false);
        }
    };

    const saveEdit = async () => {
        if (!dish || !requestId) return;
        try {
            await api.put(`/dishes/${dish.dishId}`, editForm);
            setDish({
                ...dish,
                name: editForm.name,
                categoryName: editForm.categoryName,
                price: parseFloat(editForm.price),
                weight: editForm.weight,
                description: editForm.description,
                variants: editForm.variants
            });
            setIsEditing(false);
            toast.success("Saved!");
        } catch (e) {
            toast.error("Failed to save");
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center p-4 md:p-6 relative animate-in fade-in duration-700">
            {/* Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}></div>
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 max-w-md w-full relative z-10 shadow-2xl scale-in-center">
                        <div className="space-y-6 text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                <FiX className="text-4xl text-red-500" />
                            </div>
                            <h3 className="text-3xl font-[1000] text-gray-900 tracking-tighter leading-none">Delete Dish?</h3>
                            <p className="text-gray-500 font-medium">Are you sure you want to remove <span className="text-gray-900 font-bold">"{dish?.name}"</span>? This action cannot be undone.</p>
                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg shadow-red-500/20"
                                >
                                    Delete Dish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Confirmation Modal */}
            {showResetModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowResetModal(false)}></div>
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 max-w-md w-full relative z-10 shadow-2xl scale-in-center border-t-8 border-red-500">
                        <div className="space-y-6 text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                <FiLoader className="text-4xl text-red-500 animate-pulse" />
                            </div>
                            <h3 className="text-3xl font-[1000] text-gray-900 tracking-tighter leading-none">Start New?</h3>
                            <p className="text-gray-500 font-medium">Are you sure? This process <span className="text-red-600 font-bold italic">will no longer be there</span> and all current progress will be lost.</p>
                            <div className="flex flex-col gap-3 pt-4">
                                <button
                                    onClick={handleReset}
                                    className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-red-500/20"
                                >
                                    YES, START FRESH
                                </button>
                                <button
                                    onClick={() => setShowResetModal(false)}
                                    className="w-full py-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
                                >
                                    GO BACK
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none fixed z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[120px]"></div>
            </div>

            <div className="w-full z-10 flex flex-col gap-6 md:gap-14 pb-12 md:pb-20">
                <ProgressBar currentStep={3} outletName={outletName} />
                
                <div className="max-w-7xl mx-auto w-full px-4 md:px-8">
                    {/* Top Detail: Dishes to Review Counter */}
                    <div className="flex flex-col items-center mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-7xl font-[1000] text-blue-600 leading-none tracking-tighter">{page}</span>
                            <span className="text-3xl font-black text-gray-200">/</span>
                            <span className="text-4xl font-black text-gray-400 tracking-tighter">{totalPages}</span>
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Dishes to Review</span>
                    </div>

                    <div className="flex flex-col items-center gap-12 relative">
                        {/* Navigation Row: [Prev] [Image | Details] [Next] */}
                        <div className="flex flex-col md:flex-row items-center gap-8 w-full">
                            {/* Navigation: Previous Button (Desktop) */}
                            <button
                                onClick={() => fetchDish(requestId!, page - 1)}
                                disabled={page <= 1}
                                className="hidden lg:flex w-20 h-20 bg-white border-2 border-gray-100 rounded-[2rem] items-center justify-center transition-all hover:border-blue-500 hover:text-blue-500 disabled:opacity-20 active:scale-90 shadow-xl shadow-gray-200/20 group shrink-0"
                            >
                                <FiChevronRight className="rotate-180 text-4xl group-hover:-translate-x-1 transition-transform" />
                            </button>

                            {/* Main Dish Card: Horizontal Layout */}
                            <div className="flex-1 w-full bg-white border border-gray-100 rounded-[3.5rem] shadow-sm flex flex-col md:flex-row overflow-hidden transition-all duration-700 hover:shadow-2xl hover:-translate-y-1">
                                {/* Left Half: AI Image */}
                                <div className="w-full md:w-1/2 bg-gray-950 relative flex items-center justify-center min-h-[350px] md:min-h-[600px]">
                                    {loading ? (
                                        <div className="flex flex-col items-center gap-4">
                                            <FiLoader className="text-5xl animate-spin text-blue-500" />
                                            <span className="text-white/20 font-black text-[10px] uppercase tracking-widest">Loading Dish</span>
                                        </div>
                                    ) : dish?.imageUrl ? (
                                        <img src={dish.imageUrl} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-6 opacity-20">
                                            <FiImage className="text-8xl text-white" />
                                            <span className="text-white font-[1000] text-xs uppercase tracking-widest">No Image Generated</span>
                                        </div>
                                    )}

                                    <div className="absolute top-8 left-8 z-10">
                                        <span className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 backdrop-blur-md border border-white/20 text-white
                                            ${dish?.imageStatus === 'ready' ? 'bg-green-500/80' :
                                                dish?.imageStatus === 'generating' ? 'bg-blue-500/80' :
                                                    'bg-amber-500/80'}`}>
                                            <div className={`w-2 h-2 rounded-full ${dish?.imageStatus === 'ready' ? 'bg-green-200 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-white animate-pulse'}`}></div>
                                            {dish?.imageStatus}
                                        </span>
                                    </div>
                                </div>

                                {/* Right Half: Editable Details */}
                                <div className="w-full md:w-1/2 p-8 md:p-14 flex flex-col gap-8 md:gap-12 bg-white relative justify-center">
                                    <div className="space-y-8">
                                        <div className="flex items-start justify-between">
                                            <div className="flex flex-col gap-3 min-h-[10px]">
                                                {/* Header area cleaned up as per user request */}
                                            </div>
                                            <div className="flex gap-3">
                                                {!isEditing && (
                                                    <>
                                                        <button onClick={() => {
                                                            setIsEditing(true);
                                                            setEditForm({
                                                                name: dish?.name || "",
                                                                price: dish?.price?.toString() || "",
                                                                weight: dish?.weight || "",
                                                                description: dish?.description || "",
                                                                categoryName: dish?.categoryName || "",
                                                                variants: dish?.variants || []
                                                            });
                                                        }} className="w-12 h-12 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-2xl flex items-center justify-center border border-gray-100 active:scale-95 transition-all shadow-sm">
                                                            <FiEdit2 size={20} />
                                                        </button>
                                                        <button 
                                                            onClick={() => setShowDeleteModal(true)}
                                                            className="w-12 h-12 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl flex items-center justify-center border border-gray-100 active:scale-95 transition-all shadow-sm"
                                                        >
                                                            <FiX size={20} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {isEditing ? (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dish Name</label>
                                                    <input
                                                        className="w-full bg-white border-2 border-transparent focus:border-blue-500 p-4 rounded-2xl text-xl font-[1000] outline-none shadow-sm transition-all"
                                                        value={editForm.name}
                                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                                                    <input
                                                        className="w-full bg-white border-2 border-transparent focus:border-blue-500 p-4 rounded-2xl text-md font-[1000] outline-none shadow-sm transition-all text-blue-600"
                                                        value={editForm.categoryName}
                                                        onChange={e => setEditForm({ ...editForm, categoryName: e.target.value })}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Price</label>
                                                        <input
                                                            className="w-full bg-white border-2 border-transparent focus:border-blue-500 p-4 rounded-2xl font-[1000] outline-none text-lg shadow-sm"
                                                            value={editForm.price}
                                                            type="number"
                                                            onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Weight</label>
                                                        <input
                                                            className="w-full bg-white border-2 border-transparent focus:border-blue-500 p-4 rounded-2xl font-[1000] outline-none text-lg shadow-sm"
                                                            value={editForm.weight}
                                                            onChange={e => setEditForm({ ...editForm, weight: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                                                    <textarea
                                                        className="w-full bg-white border-2 border-transparent focus:border-blue-500 p-4 rounded-2xl text-sm min-h-[100px] outline-none font-bold text-gray-600 resize-none shadow-sm custom-scrollbar"
                                                        value={editForm.description}
                                                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                    />
                                                </div>

                                                {/* Variants Editor */}
                                                <div className="pt-2 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Variants</label>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setEditForm({ ...editForm, variants: [...editForm.variants, { variantType: "", label: "", price: 0 }] })}
                                                            className="text-blue-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1"
                                                        >
                                                            <FiPlus /> Add Variant
                                                        </button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {editForm.variants.map((v, idx) => (
                                                            <div key={idx} className="flex gap-2 items-center">
                                                                <input 
                                                                    placeholder="Type"
                                                                    className="w-[72px] shrink-0 bg-white border border-gray-100 p-3 rounded-xl text-xs font-bold"
                                                                    value={v.variantType || ""}
                                                                    onChange={e => {
                                                                        const newVars = [...editForm.variants];
                                                                        newVars[idx].variantType = e.target.value;
                                                                        setEditForm({ ...editForm, variants: newVars });
                                                                    }}
                                                                />
                                                                <input 
                                                                    placeholder="Size/Desc"
                                                                    className="flex-1 min-w-[60px] bg-white border border-gray-100 p-3 rounded-xl text-xs font-bold"
                                                                    value={v.label}
                                                                    onChange={e => {
                                                                        const newVars = [...editForm.variants];
                                                                        newVars[idx].label = e.target.value;
                                                                        setEditForm({ ...editForm, variants: newVars });
                                                                    }}
                                                                />
                                                                <div className="w-24 relative shrink-0">
                                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[10px]">{outletCurrency || '₹'}</span>
                                                                    <input 
                                                                        placeholder="Price"
                                                                        type="number"
                                                                        className="w-full text-left p-3 pl-[1.6rem] bg-white border border-gray-100 rounded-xl text-xs font-bold"
                                                                        value={v.price === 0 ? "" : v.price}
                                                                        onChange={e => {
                                                                            const newVars = [...editForm.variants];
                                                                            newVars[idx].price = parseFloat(e.target.value) || 0;
                                                                            setEditForm({ ...editForm, variants: newVars });
                                                                        }}
                                                                    />
                                                                </div>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setEditForm({ ...editForm, variants: editForm.variants.filter((_, i) => i !== idx) })}
                                                                    className="p-2 shrink-0 text-red-400"
                                                                >
                                                                    <FiX size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex gap-4 pt-2">
                                                    <button onClick={saveEdit} className="bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl text-[10px] uppercase font-black tracking-[0.2em] flex-1 active:scale-95 transition-all shadow-xl shadow-green-500/20">SAVE CHANGES</button>
                                                    <button onClick={() => setIsEditing(false)} className="bg-white border border-gray-100 hover:bg-gray-50 text-gray-400 py-4 rounded-2xl text-[10px] uppercase font-black tracking-[0.2em] flex-1 active:scale-95 transition-all">CANCEL</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6 animate-in zoom-in-95 duration-500">
                                                <div className="space-y-3">
                                                    <h1 className="text-3xl lg:text-6xl font-[1000] text-gray-900 tracking-tighter leading-tight transition-all">
                                                        {dish?.name || "NA"}
                                                    </h1>
                                                    
                                                    <div className="flex flex-wrap gap-8 items-end pt-2">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Price</label>
                                                            <span className="text-2xl lg:text-5xl text-blue-600 font-[1000] tracking-tighter leading-none">
                                                                {dish?.price && dish.price > 0 ? `${outletCurrency}${dish.price}` : "NA"}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Weight</label>
                                                            <span className="text-xl lg:text-3xl text-gray-400 font-extrabold tracking-tighter leading-none opacity-40">
                                                                {dish?.weight || "NA"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Variants Display */}
                                                {(dish?.variants || []).length > 0 && (
                                                    <div className="space-y-3 pt-2">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Variants</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {dish?.variants.map((v, i) => (
                                                                <div key={i} className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-2xl flex items-center gap-3">
                                                                    <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">{v.variantType ? `${v.variantType}: ` : ""}{v.label}</span>
                                                                    <span className="text-sm font-black text-blue-400 leading-none">{outletCurrency}{v.price}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-4 pt-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Description</label>
                                                    <div className="relative">
                                                        <div className="absolute left-0 top-0 w-1.5 h-full bg-blue-100/50 rounded-full"></div>
                                                        <p className="pl-6 text-gray-500 text-xl md:text-2xl leading-relaxed font-medium italic opacity-80">"{dish?.description || "NA"}"</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-6">
                                        {(dish?.generationCount || 0) < generationLimit ? (
                                            <button
                                                onClick={generateImage}
                                                disabled={generating}
                                                className={`w-full py-6 rounded-[2rem] font-[1000] text-xl transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-4 ${dish?.imageStatus === 'ready'
                                                    ? 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                                                    }`}
                                            >
                                                {generating ? (
                                                    <div className="flex items-center gap-3">
                                                        <FiLoader className="animate-spin text-2xl" />
                                                        <span>GENERATING...</span>
                                                    </div>
                                                ) : dish?.imageStatus === 'ready' ? "RE-GENERATE AI PHOTO" : "GENERATE AI PHOTO"}
                                            </button>
                                        ) : (
                                            <div className="w-full py-6 rounded-[2rem] bg-gray-50 text-gray-400 font-[1000] text-xl flex items-center justify-center gap-4 border-2 border-gray-100 uppercase tracking-widest shadow-inner">
                                                Daily Limit Reached
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Navigation: Next Button (Desktop) */}
                            <button
                                onClick={() => fetchDish(requestId!, page + 1)}
                                disabled={page >= totalPages}
                                className="hidden lg:flex w-20 h-20 bg-white border-2 border-gray-100 rounded-[2rem] items-center justify-center transition-all hover:border-blue-500 hover:text-blue-500 disabled:opacity-20 active:scale-90 shadow-xl shadow-gray-200/20 group shrink-0"
                            >
                                <FiChevronRight className="text-4xl group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        {/* Mobile Navigation Controls */}
                        <div className="flex lg:hidden w-full gap-4 justify-between mt-4">
                            <button
                                onClick={() => fetchDish(requestId!, page - 1)}
                                disabled={page <= 1}
                                className="flex-1 py-5 bg-white border-2 border-gray-100 rounded-3xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest disabled:opacity-20 active:scale-95 transition-all"
                            >
                                <FiChevronRight className="rotate-180 text-xl" /> Previous
                            </button>
                            <button
                                onClick={() => fetchDish(requestId!, page + 1)}
                                disabled={page >= totalPages}
                                className="flex-1 py-5 bg-white border-2 border-gray-100 rounded-3xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest disabled:opacity-20 active:scale-95 transition-all"
                            >
                                Next <FiChevronRight className="text-xl" />
                            </button>
                        </div>

                        {/* Final Action Row (Moved to Bottom) */}
                        <div className="w-full max-w-4xl flex flex-col md:flex-row gap-6 mt-16 pb-12 items-stretch animate-in slide-in-from-bottom-10 duration-1000">
                            <div className="flex-1 bg-gray-50 md:bg-white border border-gray-100 rounded-[3rem] p-8 md:p-12 shadow-sm flex flex-col md:flex-row items-center justify-between gap-10">
                                <div className="space-y-4 text-center md:text-left">
                                    <h2 className="text-3xl font-[1000] text-gray-900 tracking-tighter leading-none">Extraction Complete</h2>
                                    <p className="text-[10px] font-black text-blue-600/50 uppercase tracking-[0.2em]">Step 3 of 4 • Design System</p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                                    <button
                                        onClick={() => setShowResetModal(true)}
                                        className="px-10 py-5 bg-white border border-red-100 text-red-500 hover:bg-red-50 rounded-[2.2rem] font-black text-[10px] uppercase tracking-[0.2em] active:scale-[0.98] transition-all shadow-sm"
                                    >
                                        Start New Process
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
                                        className="px-12 py-7 bg-gray-950 hover:bg-black text-white rounded-[2.5rem] font-[1000] text-xl flex items-center justify-center gap-4 active:scale-[0.98] shadow-2xl transition-all shadow-gray-900/40 relative overflow-hidden group"
                                    >
                                        <span className="relative z-10 flex items-center gap-3 uppercase tracking-tighter">FINISH MENU <FiChevronRight /></span>
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

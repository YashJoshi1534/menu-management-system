import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import { FiSave, FiRefreshCw, FiArrowLeft, FiCamera } from "react-icons/fi";
import toast from "react-hot-toast";

interface Dish {
    dishId: string;
    requestId: string; // Needed for specific regeneration endpoint if it requires requestId
    name: string;
    price: number | null;
    weight: string | null;
    description: string | null;
    imageUrl: string | null;
    imageStatus?: string;
}

interface Category {
    categoryName: string;
    dishes: Dish[];
}

interface StoreData {
    storeName: string;
    logoUrl: string;
}

export default function ManageMenu() {
    const { storeUid } = useParams();
    const navigate = useNavigate();
    const [store, setStore] = useState<StoreData | null>(null);
    const [menu, setMenu] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

    useEffect(() => {
        if (storeUid) fetchMenu();
    }, [storeUid]);

    const fetchMenu = async () => {
        try {
            const res = await api.get(`/stores/${storeUid}/menu`);
            setStore(res.data.store);
            setMenu(res.data.menu);
        } catch (error) {
            toast.error("Failed to load menu");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateDish = async (dishId: string, field: string, value: any) => {
        // Optimistic update
        const newMenu = menu.map(cat => ({
            ...cat,
            dishes: cat.dishes.map(d => d.dishId === dishId ? { ...d, [field]: value } : d)
        }));
        setMenu(newMenu);
    };

    const saveDish = async (dish: Dish) => {
        try {
            await api.put(`/dishes/${dish.dishId}`, {
                name: dish.name,
                price: dish.price,
                weight: dish.weight,
                description: dish.description
            });
            toast.success("Saved!");
        } catch (e) {
            toast.error("Failed to save");
        }
    };

    const regenerateImage = async (dish: Dish) => {
        if (!dish.requestId) {
            toast.error("Cannot regenerate: Missing request context");
            return;
        }
        setRegeneratingId(dish.dishId);
        try {
            const res = await api.post(`/requests/${dish.requestId}/generate-image/${dish.dishId}`);

            // Update image in state
            const newMenu = menu.map(cat => ({
                ...cat,
                dishes: cat.dishes.map(d => d.dishId === dish.dishId ? { ...d, imageUrl: res.data.imageUrl } : d)
            }));
            setMenu(newMenu);
            toast.success("Image Regenerated!");
        } catch (e) {
            toast.error("Generation failed");
        } finally {
            setRegeneratingId(null);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Editor...</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 pb-20 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-3xl"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/10 blur-3xl"></div>
            </div>

            {/* Header */}
            <div className="bg-white/80 backdrop-blur-xl shadow-sm sticky top-0 z-30 px-6 py-4 flex items-center justify-between border-b border-white">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-3 hover:bg-gray-100/50 rounded-full transition-colors group">
                        <FiArrowLeft className="text-xl text-gray-500 group-hover:text-gray-900 transition-colors" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Edit Menu</h1>
                        <p className="text-gray-500 text-sm font-medium">{store?.storeName}</p>
                    </div>
                </div>
                <button 
                    onClick={() => window.open(`/${storeUid}/menu`, '_blank')} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
                >
                    View Live Website
                </button>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 mt-10 space-y-12 relative z-10">
                {menu.map((category, catIdx) => (
                    <div 
                        key={category.categoryName} 
                        className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white animate-in fade-in slide-in-from-bottom-4 duration-500"
                        style={{ animationDelay: `${catIdx * 100}ms` }}
                    >
                        <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-100">
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-xl">
                                {category.categoryName.charAt(0)}
                            </div>
                            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                                {category.categoryName}
                            </h2>
                            <span className="bg-gray-100 text-gray-500 font-bold px-3 py-1 rounded-full text-sm ml-auto">
                                {category.dishes.length} Items
                            </span>
                        </div>

                        <div className="grid gap-8">
                            {category.dishes.map((dish, dishIdx) => (
                                <div 
                                    key={dish.dishId} 
                                    className="flex flex-col md:flex-row gap-8 p-6 bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 transition-all group animate-in fade-in"
                                    style={{ animationDelay: `${(catIdx * 100) + (dishIdx * 50)}ms` }}
                                >
                                    {/* Image Section */}
                                    <div className="w-full md:w-1/3 flex flex-col gap-3">
                                        <div className="w-full aspect-square md:aspect-auto md:h-64 bg-gray-950 rounded-2xl overflow-hidden relative group/img shadow-inner">
                                            {/* Subtle grid pattern background */}
                                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                                            
                                            {dish.imageUrl ? (
                                                <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover z-10 relative drop-shadow-2xl transition-transform duration-500 group-hover/img:scale-110" />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-gray-500 z-10 relative">
                                                    <FiCamera className="text-4xl mb-2 opacity-50" />
                                                    <span className="font-medium text-sm">No Image</span>
                                                </div>
                                            )}

                                            {regeneratingId === dish.dishId && (
                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
                                                    <FiRefreshCw className="animate-spin text-3xl mb-3 text-blue-400" />
                                                    <span className="font-bold tracking-widest text-xs uppercase text-blue-200 animate-pulse">Generating</span>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => regenerateImage(dish)}
                                            disabled={!!regeneratingId}
                                            className="w-full py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100 active:scale-95"
                                        >
                                            <FiRefreshCw className={regeneratingId === dish.dishId ? "animate-spin" : ""} />
                                            <span className="tracking-tight">Regenerate AI Image</span>
                                        </button>
                                    </div>

                                    {/* Edit Details Section */}
                                    <div className="flex-1 flex flex-col justify-between space-y-5">
                                        <div className="space-y-4">
                                            <div className="relative group/input">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest absolute -top-2 left-3 bg-white px-2 z-10 transition-colors group-focus-within/input:text-blue-600">Dish Name</label>
                                                <input
                                                    className="w-full p-4 border border-gray-200 bg-gray-50 focus:bg-white rounded-xl font-extrabold text-gray-900 text-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                    value={dish.name}
                                                    onChange={(e) => handleUpdateDish(dish.dishId, "name", e.target.value)}
                                                />
                                            </div>

                                            <div className="flex gap-4">
                                                <div className="flex-1 relative group/input">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest absolute -top-2 left-3 bg-white px-2 z-10 transition-colors group-focus-within/input:text-blue-600">Price</label>
                                                    <span className="absolute left-4 top-4 text-gray-500 font-bold">$</span>
                                                    <input
                                                        className="w-full pl-9 p-4 border border-gray-200 bg-gray-50 focus:bg-white rounded-xl font-bold text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                        type="number"
                                                        value={dish.price || ""}
                                                        onChange={(e) => handleUpdateDish(dish.dishId, "price", e.target.value)}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div className="flex-1 relative group/input">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest absolute -top-2 left-3 bg-white px-2 z-10 transition-colors group-focus-within/input:text-blue-600">Weight/Qty</label>
                                                    <input
                                                        className="w-full p-4 border border-gray-200 bg-gray-50 focus:bg-white rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                        value={dish.weight || ""}
                                                        onChange={(e) => handleUpdateDish(dish.dishId, "weight", e.target.value)}
                                                        placeholder="e.g. 250g"
                                                    />
                                                </div>
                                            </div>

                                            <div className="relative group/input flex-1 flex flex-col">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest absolute -top-2 left-3 bg-white px-2 z-10 transition-colors group-focus-within/input:text-blue-600">Description</label>
                                                <textarea
                                                    className="w-full p-4 border border-gray-200 bg-gray-50 focus:bg-white rounded-xl text-sm h-full min-h-[100px] resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all leading-relaxed"
                                                    value={dish.description || ""}
                                                    onChange={(e) => handleUpdateDish(dish.dishId, "description", e.target.value)}
                                                    placeholder="Dish description..."
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-2">
                                            <button
                                                onClick={() => saveDish(dish)}
                                                className="bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold shadow-md hover:shadow-xl hover:bg-black transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <FiSave className="text-lg" /> 
                                                <span className="tracking-tight">Save Changes</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

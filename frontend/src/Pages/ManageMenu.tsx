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
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white shadow-sm sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                        <FiArrowLeft className="text-xl" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Edit Menu</h1>
                        <p className="text-gray-500 text-sm">{store?.storeName}</p>
                    </div>
                </div>
                <button onClick={() => window.open(`/${storeUid}/preview`, '_blank')} className="text-blue-600 font-semibold text-sm">
                    View Live
                </button>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 mt-8 space-y-10">
                {menu.map((category) => (
                    <div key={category.categoryName} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b">
                            {category.categoryName}
                        </h2>

                        <div className="grid gap-8">
                            {category.dishes.map((dish) => (
                                <div key={dish.dishId} className="flex flex-col md:flex-row gap-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    {/* Image Section */}
                                    <div className="w-full md:w-1/3 flex flex-col gap-2">
                                        <div className="w-full aspect-video bg-gray-200 rounded-lg overflow-hidden relative group">
                                            {dish.imageUrl ? (
                                                <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                                            )}

                                            {regeneratingId === dish.dishId && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                                                    Generating...
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => regenerateImage(dish)}
                                            disabled={!!regeneratingId}
                                            className="w-full py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-200 flex items-center justify-center gap-2"
                                        >
                                            <FiRefreshCw className={regeneratingId === dish.dishId ? "animate-spin" : ""} />
                                            Regenerate AI Image
                                        </button>
                                    </div>

                                    {/* Edit Details Section */}
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Dish Name</label>
                                            <input
                                                className="w-full p-2 border rounded-lg font-bold text-gray-900"
                                                value={dish.name}
                                                onChange={(e) => handleUpdateDish(dish.dishId, "name", e.target.value)}
                                            />
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Price</label>
                                                <input
                                                    className="w-full p-2 border rounded-lg"
                                                    type="number"
                                                    value={dish.price || ""}
                                                    onChange={(e) => handleUpdateDish(dish.dishId, "price", e.target.value)}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Weight/Qty</label>
                                                <input
                                                    className="w-full p-2 border rounded-lg"
                                                    value={dish.weight || ""}
                                                    onChange={(e) => handleUpdateDish(dish.dishId, "weight", e.target.value)}
                                                    placeholder="e.g. 250g"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                                            <textarea
                                                className="w-full p-2 border rounded-lg text-sm h-20"
                                                value={dish.description || ""}
                                                onChange={(e) => handleUpdateDish(dish.dishId, "description", e.target.value)}
                                                placeholder="Dish description..."
                                            />
                                        </div>

                                        <div className="flex justify-end pt-2">
                                            <button
                                                onClick={() => saveDish(dish)}
                                                className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-green-700 flex items-center gap-2"
                                            >
                                                <FiSave /> Save Changes
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

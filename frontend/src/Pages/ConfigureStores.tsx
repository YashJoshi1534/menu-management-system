import { useState, useEffect } from "react";
import api from "../api/client";
import { FiArrowLeft, FiEdit2, FiTrash2, FiSave, FiX, FiCheckCircle, FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import useDebounce from "../hooks/useDebounce";

export default function ConfigureStores() {
    const navigate = useNavigate();
    const { business } = useAuth();
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 400);
    
    // Edit modal state
    const [editingStore, setEditingStore] = useState<any | null>(null);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (business?.businessId) {
            fetchStores(debouncedSearchQuery);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [business, debouncedSearchQuery]);

    const fetchStores = async (searchTerm: string = "") => {
        setLoading(true);
        try {
            const endpoint = `/businesses/${business?.businessId}/stores${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ""}`;
            const res = await api.get(endpoint);
            setStores(res.data);
        } catch (error) {
            toast.error("Failed to fetch stores");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (storeUid: string) => {
        if (!window.confirm("Are you sure you want to delete this store? This action cannot be undone.")) return;
        try {
            await api.delete(`/stores/${storeUid}`);
            toast.success("Store deleted successfully");
            setStores(stores.filter(s => s.storeUid !== storeUid));
        } catch (error) {
            toast.error("Failed to delete store");
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdateLoading(true);
        try {
            let finalLogoUrl = editingStore.logoUrl;
            if (newLogoFile) {
                const formData = new FormData();
                formData.append("logo", newLogoFile);
                const res = await api.put(`/stores/${editingStore.storeUid}/logo`, formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                finalLogoUrl = res.data.logoUrl;
            }

            await api.put(`/stores/${editingStore.storeUid}`, {
                storeName: editingStore.storeName,
                address: editingStore.address,
                city: editingStore.city,
                zipCode: editingStore.zipCode,
                phone: editingStore.phone,
                isActive: editingStore.isActive,
                logoUrl: finalLogoUrl
            });
            toast.success("Store updated successfully");
            setEditingStore(null);
            setNewLogoFile(null);
            setPreviewUrl(null);
            fetchStores(debouncedSearchQuery);
        } catch (error) {
            toast.error("Failed to update store");
        } finally {
            setUpdateLoading(false);
        }
    };

    return (
        <div className="h-[calc(100vh-76px)] bg-gray-50 p-4 md:p-8 relative overflow-y-auto animate-in fade-in duration-500 scrollbar-hide">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate("/dashboard")}
                            className="p-3 bg-white text-gray-500 hover:text-blue-600 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md shrink-0"
                        >
                            <FiArrowLeft className="text-xl" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Configure Stores</h1>
                            <p className="text-gray-500 font-medium mt-1">Manage store details, statuses, and removals.</p>
                        </div>
                    </div>
                    <div className="relative w-full sm:w-72">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                        <input
                            type="text"
                            placeholder="Search by store name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-2xl outline-none transition-all shadow-sm font-medium"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {stores.length === 0 ? (
                            <div className="bg-white p-12 rounded-[2rem] shadow-sm border border-gray-100 text-center">
                                <p className="text-gray-500 text-lg">No stores found.</p>
                            </div>
                        ) : (
                            stores.map(store => (
                                <div key={store.storeUid} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-5">
                                        {store.logoUrl ? (
                                            <img src={store.logoUrl} alt={store.storeName} className="w-16 h-16 rounded-2xl object-cover shadow-sm bg-gray-50" />
                                        ) : (
                                            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 text-2xl font-bold shadow-sm">
                                                {store.storeName?.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                                {store.storeName}
                                                {store.isActive !== false ? (
                                                    <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg flex items-center gap-1">
                                                        <FiCheckCircle /> Active
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg flex items-center gap-1">
                                                        <FiX /> Inactive
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-gray-500 text-sm mt-1">{store.address}, {store.city} {store.zipCode}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <button 
                                            onClick={() => {
                                                setEditingStore({ ...store, isActive: store.isActive !== false });
                                                setNewLogoFile(null);
                                                setPreviewUrl(store.logoUrl || null);
                                            }}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 rounded-xl font-semibold transition-colors"
                                        >
                                            <FiEdit2 /> Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(store.storeUid)}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl font-semibold transition-colors"
                                        >
                                            <FiTrash2 /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingStore && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Edit Store</h2>
                            <button 
                                onClick={() => setEditingStore(null)}
                                className="p-2 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <FiX className="text-xl" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className="p-8 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Store Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={editingStore.storeName || ""}
                                    onChange={e => setEditingStore({...editingStore, storeName: e.target.value})}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">City</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={editingStore.city || ""}
                                        onChange={e => setEditingStore({...editingStore, city: e.target.value})}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">ZIP Code</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={editingStore.zipCode || ""}
                                        onChange={e => setEditingStore({...editingStore, zipCode: e.target.value})}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Address</label>
                                <input 
                                    type="text" 
                                    required
                                    value={editingStore.address || ""}
                                    onChange={e => setEditingStore({...editingStore, address: e.target.value})}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Store Logo</label>
                                <div className="flex items-center gap-4">
                                    {previewUrl ? (
                                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-gray-200">
                                            <img src={previewUrl} alt="Store Logo Preview" className="w-full h-full object-cover" />
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setPreviewUrl(null);
                                                    setNewLogoFile(null);
                                                    setEditingStore({...editingStore, logoUrl: null});
                                                }}
                                                className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full transition-colors"
                                            >
                                                <FiX size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-200 border-dashed flex items-center justify-center text-gray-400 text-xs text-center font-medium p-2">
                                            No image
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 hover:border-blue-300 text-sm font-medium text-gray-700 transition-all shadow-sm">
                                            <span>Select new image</span>
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                className="hidden" 
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        const file = e.target.files[0];
                                                        setNewLogoFile(file);
                                                        setPreviewUrl(URL.createObjectURL(file));
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-gray-900">Active Status</h4>
                                    <p className="text-sm text-gray-500 mt-0.5">Toggle to show/hide this store.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEditingStore({...editingStore, isActive: !editingStore.isActive})}
                                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${editingStore.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}
                                >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${editingStore.isActive ? 'translate-x-8' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={updateLoading}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-lg active:scale-95"
                                >
                                    {updateLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <><FiSave /> Save Changes</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

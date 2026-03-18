import React, { useState, useEffect } from "react";
import api from "../api/client";
import { FiShoppingBag, FiUploadCloud, FiMapPin, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import ProgressBar from "../components/ProgressBar";

export default function StoreSetup() {
    const [storeName, setStoreName] = useState(() => localStorage.getItem("store_setup_name") || "");
    const [address, setAddress] = useState(() => localStorage.getItem("store_setup_address") || "");
    const [city, setCity] = useState(() => localStorage.getItem("store_setup_city") || "");
    const [zipCode, setZipCode] = useState(() => localStorage.getItem("store_setup_zip") || "");
    const [logo, setLogo] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isExistingStore, setIsExistingStore] = useState(false);
    const [isFetchingStore, setIsFetchingStore] = useState(false);
    
    const navigate = useNavigate();
    const { business, selectedStoreUid, setSelectedStoreUid } = useAuth();

    // Fetch existing store details if selectedStoreUid is present
    useEffect(() => {
        if (selectedStoreUid) {
            const fetchStoreDetails = async () => {
                setIsFetchingStore(true);
                try {
                    const res = await api.get(`/businesses/${business?.businessId}/stores`);
                    const store = res.data.find((s: any) => s.storeUid === selectedStoreUid);
                    if (store) {
                        setStoreName(store.storeName || "");
                        setAddress(store.address || "");
                        setCity(store.city || "");
                        setZipCode(store.zipCode || "");
                        if (store.logoUrl) {
                            setPreview(store.logoUrl);
                        }
                        setIsExistingStore(true);
                    }
                } catch (error) {
                    console.error("Failed to fetch store details", error);
                } finally {
                    setIsFetchingStore(false);
                }
            };
            fetchStoreDetails();
        } else {
            // New store: load from localStorage
            setStoreName(localStorage.getItem("store_setup_name") || "");
            setAddress(localStorage.getItem("store_setup_address") || "");
            setCity(localStorage.getItem("store_setup_city") || "");
            setZipCode(localStorage.getItem("store_setup_zip") || "");
            setPreview(null);
            setLogo(null);
            setIsExistingStore(false);
            setIsFetchingStore(false);
        }
    }, [selectedStoreUid, business]);

    // Persist to localStorage only if NOT an existing store AND NOT currently fetching one
    useEffect(() => {
        if (!isExistingStore && !isFetchingStore && !selectedStoreUid) {
            localStorage.setItem("store_setup_name", storeName);
            localStorage.setItem("store_setup_address", address);
            localStorage.setItem("store_setup_city", city);
            localStorage.setItem("store_setup_zip", zipCode);
        }
    }, [storeName, address, city, zipCode, isExistingStore, isFetchingStore, selectedStoreUid]);

    useEffect(() => {
        if (!business) {
            toast.error("Please login first");
            navigate("/");
            return;
        }
    }, [business, navigate]);

    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Clean up object URL (only if it's a blob url)
    useEffect(() => {
        return () => {
            if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    const isFormValid = !!(storeName && address && city && zipCode.length === 6);

    const processFiles = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        
        const file = files[0];
        if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
        
        setLogo(file);
        setPreview(URL.createObjectURL(file));
        
        // Reset input value to allow re-uploading same file
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        processFiles(e.target.files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        processFiles(e.dataTransfer.files);
    };

    const removeImage = () => {
        if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
        setLogo(null);
        setPreview(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;
        
        setLoading(true);

        const formData = new FormData();
        formData.append("storeName", storeName);
        formData.append("address", address);
        formData.append("city", city);
        formData.append("zipCode", zipCode);
        if (logo) {
            formData.append("logo", logo);
        }

        try {
            let res;
            if (isExistingStore && selectedStoreUid) {
                // Ensure returning to an existing store creates a fresh request session tied correctly
                const reqRes = await api.post(`/stores/${selectedStoreUid}/requests`);
                localStorage.setItem("requestId", reqRes.data.requestId);
                toast.success("Continuing with your store! 🚀");
            } else {
                res = await api.post(`/businesses/${business?.businessId}/stores`, formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                const storeUid = res.data.storeUid;
                setSelectedStoreUid(storeUid);
                
                // Initiate the request process immediately
                const reqRes = await api.post(`/stores/${storeUid}/requests`);
                localStorage.setItem("requestId", reqRes.data.requestId);

                // Clear persistence
                localStorage.removeItem("store_setup_name");
                localStorage.removeItem("store_setup_address");
                localStorage.removeItem("store_setup_city");
                localStorage.removeItem("store_setup_zip");
                
                toast.success("Store created! Let's upload your menu. 🚀");
            }
            
            setTimeout(() => navigate("/menu-upload"), 800);
        } catch (error: any) {
            console.error(error);
            toast.error(error?.response?.data?.detail || "Process failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-[calc(100vh-76px)] bg-white flex flex-col items-center p-4 md:p-6 relative overflow-hidden animate-in fade-in duration-700">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none fixed z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[120px]"></div>
            </div>

            <div className="w-full z-10 flex flex-col gap-6 h-full overflow-y-auto scrollbar-hide">
                <ProgressBar currentStep={1} />
                
                <div className="text-center space-y-2">
                    <h2 className="text-3xl md:text-4xl font-[1000] text-gray-900 tracking-tighter leading-none">Create your store</h2>
                    <p className="text-gray-400 text-sm md:text-base font-medium max-w-2xl mx-auto">Set up your store to build your digital menu in minutes.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-start flex-1">
                        {/* Left Column: Basic Info & Horizontal Upload */}
                        <div className="space-y-6 flex flex-col h-full">
                            <div className="relative group">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
                                    Store Name <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <FiShoppingBag className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-all text-xl" />
                                    <input
                                        type="text"
                                        placeholder="Enter restaurant name"
                                        required
                                        value={storeName}
                                        className="w-full pl-14 pr-6 py-6 bg-gray-50/50 border-2 border-transparent rounded-[2rem] focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-bold text-lg placeholder:text-gray-300 shadow-sm"
                                        onChange={(e) => setStoreName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="relative group flex-1 flex flex-col min-h-0">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
                                    Store Logo <span className="text-gray-400/60 font-medium">(Optional)</span>
                                </label>
                                <div className="flex flex-row gap-6 items-start flex-1 min-h-0">
                                    {/* Small Square Upload Box */}
                                    <label 
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`relative w-48 h-48 flex-shrink-0 border-4 border-dashed rounded-[2rem] transition-all group overflow-hidden flex flex-col items-center justify-center p-4 text-center cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50/20' : 'border-gray-100 bg-gray-50/30 hover:border-blue-400 hover:bg-blue-50/20'}`}
                                    >
                                        <div className="bg-white p-4 rounded-2xl shadow-lg mb-2 group-hover:-translate-y-1 transition-all duration-500 border border-blue-50">
                                            <FiUploadCloud className={`text-3xl transition-colors duration-500 ${isDragging ? 'text-blue-600 scale-110' : 'text-blue-500'}`} />
                                        </div>
                                        <span className={`text-base font-black tracking-tight leading-tight transition-colors duration-500 ${isDragging ? 'text-blue-700' : 'text-gray-800'}`}>
                                            {isDragging ? 'Drop' : 'Upload'}
                                        </span>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                    </label>

                                    {/* Single Preview Display */}
                                    <div className="flex-1 max-w-[200px]">
                                        {preview && (
                                            <div className="relative aspect-square rounded-xl overflow-hidden shadow-sm border-2 border-white group/item">
                                                <img src={preview} alt="Store Logo" className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-700" />
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); removeImage(); }}
                                                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 transition-all scale-0 group-hover/item:scale-100"
                                                >
                                                    <FiX className="text-base" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Location */}
                        <div className="space-y-6 flex flex-col h-full">
                            <div className="relative group">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
                                    Street Address <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <FiMapPin className="absolute left-6 top-6 text-gray-300 group-focus-within:text-blue-500 transition-all text-xl" />
                                    <textarea
                                        placeholder="Enter full street address"
                                        required
                                        rows={4}
                                        value={address}
                                        className="w-full pl-14 pr-6 py-6 bg-gray-50/50 border-2 border-transparent rounded-[2rem] focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-bold text-lg placeholder:text-gray-300 shadow-sm resize-none"
                                        onChange={(e) => setAddress(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="relative group">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
                                        City <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="City"
                                        required
                                        value={city}
                                        className="w-full px-6 py-6 bg-gray-50/50 border-2 border-transparent rounded-[2rem] focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-bold text-lg placeholder:text-gray-300 shadow-sm"
                                        onChange={(e) => setCity(e.target.value)}
                                    />
                                </div>
                                <div className="relative group">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
                                        Zip Code <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="6 digits"
                                        required
                                        maxLength={6}
                                        value={zipCode}
                                        className="w-full px-6 py-6 bg-gray-50/50 border-2 border-transparent rounded-[2rem] focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-bold text-lg placeholder:text-gray-300 shadow-sm"
                                        onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ""))}
                                    />
                                </div>
                            </div>
                            <div className="flex-1"></div>
                        </div>
                    </div>
                    <div className="pt-2 flex flex-col items-center gap-2">
                        <button
                            type="submit"
                            disabled={loading || !isFormValid}
                            className={`group relative overflow-hidden px-12 py-5 rounded-[2rem] font-black text-lg uppercase tracking-widest shadow-xl active:translate-y-0 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed min-w-[320px] ${loading ? 'bg-gray-400' : 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white'}`}
                        >
                            <div className="relative flex items-center justify-center gap-3">
                                {loading ? (
                                    <span>{isExistingStore ? "CONTINUING..." : "CREATING..."}</span>
                                ) : (
                                    <>
                                        <span>{isExistingStore ? "CONTINUE WITH YOUR STORE" : "CREATE YOUR STORE"}</span>
                                        <span className="text-xl">✨</span>
                                    </>
                                )}
                            </div>
                        </button>
                        <p className="text-gray-400 text-[10px] font-black tracking-widest uppercase opacity-40">Step 1 of 4 • Setup</p>
                    </div>
                </form>
            </div>
        </div>
    );
}

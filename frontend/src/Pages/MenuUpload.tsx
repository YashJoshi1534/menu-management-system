import { useState, useEffect, useRef } from "react";
import { FiUploadCloud, FiFileText, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import ProgressBar from "../components/ProgressBar";

export default function MenuUpload() {
    const [images, setImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const [requestId, setRequestId] = useState<string | null>(null);
    const [outletName, setOutletName] = useState<string>("");
    const [maxImages, setMaxImages] = useState<number>(5);
    const { selectedOutletUid, business } = useAuth();

    useEffect(() => {
        const id = localStorage.getItem("requestId");
        if (!id) {
            navigate("/dashboard");
        }
        setRequestId(id);

        if (selectedOutletUid) {
            api.get(`/outlets/${selectedOutletUid}/menu`)
                .then(res => {
                    if (res.data?.outlet?.storeName) setOutletName(res.data.outlet.storeName);
                })
                .catch(err => console.error("Failed to fetch outlet name", err));
        }

        if (business?.businessId) {
            // Fetch Config for limits
            api.get(`/auth/config?businessId=${business.businessId}`)
                .then(res => {
                    if (res.data.maxImagesPerUpload) {
                        setMaxImages(res.data.maxImagesPerUpload);
                    }
                })
                .catch(err => console.error("Failed to fetch config", err));
        }
    }, [navigate, selectedOutletUid, business]);

    // Clean up object URLs to avoid memory leaks
    useEffect(() => {
        return () => {
            previews.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    const processFiles = (files: FileList | null) => {
        if (!files) return;

        const selectedFiles = Array.from(files);
        const totalImages = images.length + selectedFiles.length;

        if (totalImages > maxImages) {
            toast.error(`Maximum ${maxImages} images allowed!`);
            const allowedCount = maxImages - images.length;
            if (allowedCount <= 0) return;

            const slicedFiles = selectedFiles.slice(0, allowedCount);
            setImages(prev => [...prev, ...slicedFiles]);
            const newPreviews = slicedFiles.map(file => URL.createObjectURL(file));
            setPreviews(prev => [...prev, ...newPreviews]);
        } else {
            setImages(prev => [...prev, ...selectedFiles]);
            const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
            setPreviews(prev => [...prev, ...newPreviews]);
        }

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

    const handleUpload = async () => {
        if (loading) return;
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

    const removeFile = (index: number) => {
        URL.revokeObjectURL(previews[index]);
        setImages(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const clearAll = () => {
        previews.forEach(url => URL.revokeObjectURL(url));
        setImages([]);
        setPreviews([]);
    };

    return (
        <div className="h-[calc(100vh-76px)] bg-white flex flex-col items-center p-4 md:p-6 relative overflow-hidden animate-in fade-in duration-700">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none fixed z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[120px]"></div>
            </div>

            <div className="w-full z-10 flex flex-col gap-6 h-full overflow-y-auto scrollbar-hide">
                <ProgressBar currentStep={2} outletName={outletName} />

                <div className="max-w-6xl mx-auto w-full px-4 md:px-8 flex flex-col gap-6 pb-20">
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl md:text-4xl font-[1000] text-gray-900 tracking-tighter leading-none">Upload Menu Images</h2>
                        <p className="text-gray-400 text-sm md:text-base font-medium max-w-2xl mx-auto">Upload photos of your menu to create your digital menu.</p>
                    </div>

                    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Left: Upload Zone */}
                        <div className="flex flex-col">
                            <label
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`min-h-[400px] flex flex-col items-center justify-center border-4 border-dashed rounded-[3rem] p-10 transition-all group relative overflow-hidden ${loading || images.length >= maxImages ? 'border-gray-100 bg-gray-50/30 cursor-not-allowed opacity-50' : (isDragging ? 'border-blue-500 bg-blue-50/50 scale-[1.01] shadow-2xl shadow-blue-100 ring-4 ring-blue-50' : 'border-gray-100 hover:border-blue-400 bg-gray-50/50 hover:bg-blue-50/20 cursor-pointer')}`}
                            >
                                <div className="bg-white p-8 rounded-[2rem] shadow-xl mb-6 group-hover:-translate-y-2 transition-all duration-500 border border-blue-50">
                                    <FiUploadCloud className={`text-5xl transition-colors duration-500 ${isDragging ? 'text-blue-600 scale-110' : 'text-blue-500'}`} />
                                </div>
                                <span className={`text-3xl font-[1000] tracking-tighter text-center leading-tight transition-colors duration-500 ${isDragging ? 'text-blue-700' : 'text-gray-800'}`}>
                                    {isDragging ? 'Drop to Add Photos' : <>Drag & Drop <br />Menu Photos</>}
                                </span>
                                <div className="mt-6 flex flex-col items-center gap-1">
                                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest opacity-60">JPG, PNG, WEBP</span>
                                    <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">{isDragging ? 'Release to upload' : `Maximum ${maxImages} images`}</span>
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    multiple
                                    accept="image/*"
                                    disabled={loading || images.length >= maxImages}
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </label>
                        </div>

                        {/* Right: Preview Grid */}
                        <div className="flex flex-col">
                            <div className={`min-h-[400px] h-full bg-white border border-gray-100 rounded-[3rem] p-8 md:p-12 flex flex-col overflow-hidden ${images.length === 0 ? 'justify-center items-center text-center' : ''} shadow-sm hover:shadow-xl transition-all duration-500`}>
                                {images.length === 0 ? (
                                    <div className="space-y-6">
                                        <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto shadow-lg border border-gray-50">
                                            <FiFileText className="text-3xl text-gray-200" />
                                        </div>
                                        <p className="text-gray-400 font-[1000] text-lg tracking-tight max-w-[250px] mx-auto opacity-40">No files selected. Upload your menu to begin.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between mb-6 px-2">
                                            <div className="flex flex-col">
                                                <h4 className="text-[10px] uppercase font-[1000] text-gray-400 tracking-[0.2em]">Selected Menu Photos</h4>
                                                <span className="text-lg font-[1000] text-blue-600 tracking-tight">{images.length}/{maxImages} images</span>
                                            </div>
                                            <button
                                                onClick={clearAll}
                                                disabled={loading}
                                                type="button"
                                                className={`bg-red-50 text-red-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-100'}`}
                                            >
                                                CLEAR ALL
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                {previews.map((url, i) => (
                                                    <div key={i} className="aspect-square relative rounded-2xl overflow-hidden group border-2 border-white shadow-sm hover:shadow-xl transition-all duration-500">
                                                        <img src={url} alt={`Menu ${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                                        {!loading && (
                                                            <button
                                                                onClick={() => removeFile(i)}
                                                                type="button"
                                                                className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 hover:scale-110 transition-all z-20 group-hover:opacity-100 opacity-0 md:opacity-100"
                                                            >
                                                                <FiX className="text-xl" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="w-full max-w-md mx-auto space-y-4 mt-4">
                        <button
                            onClick={handleUpload}
                            disabled={loading || images.length === 0}
                            className={`w-full py-6 rounded-[2rem] font-[1000] text-xl tracking-tight transition-all shadow-xl flex items-center justify-center gap-4 active:scale-[0.98] ${
                                images.length === 0 
                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none" 
                                    : loading 
                                        ? "bg-slate-800 text-white cursor-not-allowed shadow-none" 
                                        : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-500/40"
                            }`}
                        >
                            {loading ? (
                                <div className="flex items-center gap-4">
                                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span className="animate-pulse">UPLOADING...</span>
                                </div>
                            ) : (
                                <>Upload Menu</>
                            )}
                        </button>
                        <p className="text-center text-gray-400 text-[10px] font-black tracking-widest uppercase opacity-40">Step 2 of 4 • Upload Menu</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

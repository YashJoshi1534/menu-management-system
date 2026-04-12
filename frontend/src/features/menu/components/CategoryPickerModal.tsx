import { FiX, FiArrowRight } from "react-icons/fi";
import type { Category } from "../types";
import { useNavigate } from "react-router-dom";

interface CategoryPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
    loading: boolean;
    outletUid: string;
}

export default function CategoryPickerModal({ 
    isOpen, 
    onClose, 
    categories, 
    loading, 
    outletUid 
}: CategoryPickerModalProps) {
    const navigate = useNavigate();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />

            {/* Modal Panel */}
            <div
                className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 px-6 py-5 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Select a Category</h3>
                        <p className="text-slate-400 text-xs mt-0.5">Choose which category's dishes to manage</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Category List */}
                <div className="overflow-y-auto max-h-[60vh] p-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 gap-3">
                            <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading categories...</span>
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-slate-400 font-bold text-sm">No categories yet.</p>
                            <p className="text-slate-300 text-xs mt-1">Add a category first before managing dishes.</p>
                        </div>
                    ) : (
                        categories.map((cat, idx) => (
                            <button
                                key={cat.categoryId}
                                onClick={() => {
                                    onClose();
                                    navigate(`/manage-menu/${outletUid}/category/${cat.categoryId}`);
                                    window.scrollTo(0, 0);
                                }}
                                className="w-full flex items-center justify-between px-4 py-4 rounded-2xl hover:bg-indigo-50 transition-all cursor-pointer group/item animate-in slide-in-from-bottom-2 duration-300"
                                style={{ animationDelay: `${idx * 50}ms` }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-indigo-950 text-white flex items-center justify-center font-black text-lg shadow-md">
                                        {cat.categoryName.charAt(0)}
                                    </div>
                                    <div className="text-left">
                                        <span className="font-black text-slate-800 text-sm block">{cat.categoryName}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cat.dishCount || 0} {(cat.dishCount || 0) === 1 ? 'dish' : 'dishes'}</span>
                                    </div>
                                </div>
                                <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover/item:bg-indigo-600 flex items-center justify-center transition-all">
                                    <FiArrowRight size={14} className="text-slate-300 group-hover/item:text-white transition-colors" />
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

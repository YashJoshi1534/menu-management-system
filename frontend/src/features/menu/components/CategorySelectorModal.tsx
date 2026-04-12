import { FiX, FiArrowRight, FiCheck } from "react-icons/fi";
import type { Category } from "../types";

interface CategorySelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
    loading: boolean;
    onSelect: (categoryId: string) => void;
    selectedCategoryId?: string | null;
}

export default function CategorySelectorModal({
    isOpen,
    onClose,
    categories,
    loading,
    onSelect,
    selectedCategoryId
}: CategorySelectorModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <div
                className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 px-8 py-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight">Change Category</h3>
                        <p className="text-slate-400 text-xs mt-1">Select a category to manage its dishes</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-8 h-8 border-3 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Loading categories...</span>
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="py-16 text-center">
                            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiX size={24} className="text-slate-200" />
                            </div>
                            <p className="text-slate-500 font-black text-sm uppercase tracking-wider">No categories yet</p>
                            <p className="text-slate-300 text-xs mt-1">Add a category first to see them here.</p>
                        </div>
                    ) : (
                        categories.map((cat, idx) => {
                            const isSelected = cat.categoryId === selectedCategoryId;
                            return (
                                <button
                                    key={cat.categoryId}
                                    disabled={isSelected}
                                    onClick={() => {
                                        onSelect(cat.categoryId);
                                        onClose();
                                    }}
                                    className={`w-full flex items-center justify-between px-5 py-5 rounded-[1.5rem] transition-all group/item animate-in slide-in-from-bottom-2 duration-300 ${isSelected ? 'bg-indigo-50 border-2 border-indigo-100 cursor-default' : 'hover:bg-slate-50 cursor-pointer'}`}
                                    style={{ animationDelay: `${idx * 40}ms` }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-md transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white group-hover/item:bg-indigo-600'}`}>
                                            {cat.categoryName.charAt(0)}
                                        </div>
                                        <div className="text-left">
                                            <span className={`font-black text-sm block tracking-tight ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                                                {cat.categoryName}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {cat.dishCount || 0} {(cat.dishCount || 0) === 1 ? 'dish' : 'dishes'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 group-hover/item:bg-indigo-600 text-slate-300 group-hover/item:text-white'}`}>
                                        {isSelected ? <FiCheck size={18} /> : <FiArrowRight size={16} />}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

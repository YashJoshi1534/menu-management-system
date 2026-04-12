import { FiRefreshCw } from "react-icons/fi";
import type { Category } from "../types";

interface CategoryEditModalProps {
    isOpen: boolean;
    isSaving: boolean;
    editingCategory: Category | null;
    categoryName: string;
    setCategoryName: (name: string) => void;
    isPublished: boolean;
    setIsPublished: (pub: boolean) => void;
    onClose: () => void;
    onSave: () => void;
}

export default function CategoryEditModal({ 
    isOpen, 
    isSaving, 
    editingCategory, 
    categoryName, 
    setCategoryName, 
    isPublished, 
    setIsPublished, 
    onClose, 
    onSave 
}: CategoryEditModalProps) {
    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 p-6 md:p-8 text-white">
                    <h2 className="text-xl md:text-2xl font-black tracking-tight">{editingCategory ? "Edit Category" : "Add New Category"}</h2>
                    <p className="text-slate-400 text-xs md:text-sm mt-1">Organize your menu items efficiently.</p>
                </div>
                <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category Name</label>
                        <input
                            autoFocus
                            className="w-full p-4 border border-slate-100 bg-slate-50 focus:bg-white rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                            placeholder="e.g. Main Course, Desserts..."
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                        />
                    </div>
                    <div className="mb-8">
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Status</label>
                        <button
                            onClick={() => setIsPublished(!isPublished)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                                isPublished 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                        >
                            <span className="font-bold">{isPublished ? 'Published' : 'Draft'}</span>
                            <div className={`w-12 h-6 rounded-full relative transition-colors ${isPublished ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isPublished ? 'left-7' : 'left-1'}`} />
                            </div>
                        </button>
                    </div>

                    <button
                        onClick={onSave}
                        disabled={isSaving || !categoryName.trim()}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-lg shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                        {isSaving ? <FiRefreshCw className="animate-spin" /> : editingCategory ? "Update Category" : "Create Category"}
                    </button>
                </div>
            </div>
        </div>
    );
}

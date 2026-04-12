import { FiTrash2, FiEdit2, FiArrowRight } from "react-icons/fi";
import type { Category } from "../types";
import { useNavigate } from "react-router-dom";

interface CategoryCardProps {
    category: Category;
    idx: number;
    isReordering: boolean;
    onEdit: (cat: Category) => void;
    onDelete: (cat: Category) => void;
    outletUid: string;
    view?: 'grid' | 'list';
}

export default function CategoryCard({ category, idx, isReordering, onEdit, onDelete, outletUid, view = 'grid' }: CategoryCardProps) {
    const navigate = useNavigate();

    if (view === 'list') {
        return (
            <div
                className="bg-white/90 backdrop-blur-md rounded-[1.2rem] p-4 shadow-sm border border-white group hover:shadow-md transition-all duration-300 flex items-center justify-between"
            >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-950 text-white flex items-center justify-center font-black text-base shadow-sm group-hover:scale-105 transition-transform">
                        {category.categoryName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {category.categoryName}
                        </h3>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none mt-1">
                            {category.dishCount || 0} {(category.dishCount || 0) === 1 ? 'Dish' : 'Dishes'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isReordering && (
                        <div className="hidden md:flex gap-1.5">
                            <button
                                onClick={() => onEdit(category)}
                                className="p-2 bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-all cursor-pointer"
                            >
                                <FiEdit2 size={14} />
                            </button>
                            <button
                                onClick={() => onDelete(category)}
                                className="p-2 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all cursor-pointer"
                            >
                                <FiTrash2 size={14} />
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => navigate(`/manage-menu/${outletUid}/category/${category.categoryId}`)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-900 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                        Manage <FiArrowRight size={14} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="h-full bg-white/90 backdrop-blur-md rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-white group hover:-translate-y-2 transition-all duration-500 animate-in slide-in-from-bottom-8"
            style={!isReordering ? { animationDelay: `${idx * 100}ms` } : {}}
        >
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-950 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
                        {category.categoryName.charAt(0)}
                    </div>
                    {!category.isPublished && (
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg">Draft</span>
                    )}
                </div>
                {!isReordering && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(category)}
                            className="p-3 bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all cursor-pointer"
                            title="Edit Category"
                        >
                            <FiEdit2 size={16} />
                        </button>
                        <button
                            onClick={() => onDelete(category)}
                            className="p-3 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all cursor-pointer"
                            title="Delete Category"
                        >
                            <FiTrash2 size={16} />
                        </button>
                    </div>
                )}
            </div>

            <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2 truncate group-hover:text-indigo-600 transition-colors">
                {category.categoryName}
            </h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">
                {category.dishCount || 0} {(category.dishCount || 0) === 1 ? 'Dish' : 'Dishes'}
            </p>

            <button
                onClick={() => navigate(`/manage-menu/${outletUid}/category/${category.categoryId}`)}
                className="w-full py-4 bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white text-slate-900 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm group-hover:shadow-indigo-200 group-hover:shadow-lg"
            >
                Manage Dishes <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
    );
}

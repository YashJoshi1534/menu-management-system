import { FiCamera, FiArrowRight } from "react-icons/fi";
import type { Dish } from "../types";

interface DishCardProps {
    dish: Dish;
    dishIdx: number;
    isReordering: boolean;
    onEdit: (id: string) => void;
    isDirty: (dish: Dish) => boolean;
    view?: 'grid' | 'list';
}

export default function DishCard({ 
    dish, 
    dishIdx, 
    isReordering, 
    onEdit, 
    isDirty,
    view = 'grid'
}: DishCardProps) {
    const dishIsDirty = isDirty(dish);

    if (view === 'list') {
        return (
            <div
                className={`bg-white/90 backdrop-blur-md rounded-[1.2rem] p-4 shadow-sm border transition-all duration-300 flex items-center justify-between group ${dishIsDirty ? 'border-indigo-200 ring-2 ring-indigo-50' : 'border-white hover:shadow-md'}`}
            >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl border border-slate-100 overflow-hidden flex-shrink-0 shadow-sm relative">
                        {dish.previewUrl || dish.imageUrl ? (
                            <img src={dish.previewUrl || dish.imageUrl!} alt={dish.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                <FiCamera size={14} className="text-slate-400" />
                            </div>
                        )}
                        {dishIsDirty && (
                            <div className="absolute inset-0 bg-indigo-600/10 backdrop-blur-[1px] flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {dish.name || "Untitled Dish"}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            {dishIsDirty && (
                                <span className="bg-indigo-600 text-white text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded flex items-center gap-1">
                                    Unsaved
                                </span>
                            )}
                            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest flex items-center gap-1.5">
                                {(dish.weight && Number(dish.weight) !== 0) && (
                                    <>
                                        <span>{dish.weight}</span>
                                        {dish.variants && dish.variants.length > 0 && <span className="text-slate-200">|</span>}
                                    </>
                                )}
                                {dish.variants && dish.variants.length > 0 && (
                                    <span className="text-indigo-500">{dish.variants.length} Variants</span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => onEdit(dish.dishId)}
                        className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
                            dishIsDirty 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                            : 'bg-slate-100 text-slate-900 hover:bg-indigo-600 hover:text-white'
                        }`}
                    >
                        Edit <FiArrowRight size={14} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`h-full bg-white/90 backdrop-blur-md rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl border transition-all duration-500 group hover:-translate-y-2 hover:shadow-2xl animate-in fade-in slide-in-from-bottom-4 ${dishIsDirty ? 'border-indigo-200 ring-4 ring-indigo-50' : 'border-white'}`}
            style={!isReordering ? { animationDelay: `${dishIdx * 50}ms` } : {}}
        >
            {/* Top row: image thumbnail */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl overflow-hidden border-2 shadow-lg flex-shrink-0 transition-transform group-hover:scale-110 ${dishIsDirty ? 'border-indigo-400' : 'border-white'}`}>
                        {dish.previewUrl || dish.imageUrl ? (
                            <img src={dish.previewUrl || dish.imageUrl!} alt={dish.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-slate-950 flex items-center justify-center">
                                <FiCamera size={20} className="text-slate-500 opacity-30" />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-1">
                        {!dish.imageUrl && !dish.previewUrl && (
                            <span className="bg-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg w-fit">No Visual</span>
                        )}
                        {dishIsDirty && (
                            <span className="bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg w-fit animate-pulse">Unsaved</span>
                        )}
                    </div>
                </div>
            </div>

            <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2 truncate group-hover:text-indigo-600 transition-colors">
                {dish.name || <span className="text-slate-300 italic font-medium">Untitled Dish</span>}
            </h3>
            
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8 flex items-center gap-2">

                {(dish.weight && Number(dish.weight) !== 0) && (
                    <>
                        <span>{dish.weight}</span>
                        {dish.variants && dish.variants.length > 0 && (
                            <span className="text-slate-200">|</span>
                        )}
                    </>
                )}
                {dish.variants && dish.variants.length > 0 && (
                    <span className="text-indigo-500">{dish.variants.length} Variants</span>
                )}
            </p>

            <button
                onClick={() => onEdit(dish.dishId)}
                className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${dishIsDirty ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-lg' : 'bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white text-slate-900 group-hover:shadow-indigo-200 group-hover:shadow-lg'}`}
            >
                Edit Details <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
    );
}

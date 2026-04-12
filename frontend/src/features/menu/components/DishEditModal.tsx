import React from "react";
import { FiCamera, FiX, FiUpload, FiRefreshCw, FiPlus, FiSave, FiTrash2 } from "react-icons/fi";
import type { Dish, OutletData } from "../types";
import toast from "react-hot-toast";

interface DishEditModalProps {
    isOpen: boolean;
    editingDishId: string | null;
    dishes: Dish[];
    outlet: OutletData | null;
    isDishDirty: (dish: Dish) => boolean;
    onClose: () => void;
    onUpdateDish: (dishId: string, field: keyof Dish, value: any) => void;
    handleDishDragOver: (e: React.DragEvent, dishId: string) => void;
    handleDishDragLeave: () => void;
    handleDishDrop: (e: React.DragEvent, dishId: string) => void;
    draggingOverDishId: string | null;
    handleGenerateImage: (dishId: string) => void;
    regeneratingId: string | null;
    handleLocalImagePreview: (dishId: string, file: File) => void;
    expandedAddons: Record<string, boolean>;
    setExpandedAddons: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    handleDeleteDish: (dish: Dish) => void;
    saveDish: (e: React.MouseEvent, dish: Dish) => void;
    isSaving: boolean;
}

export default function DishEditModal({
    isOpen,
    editingDishId,
    dishes,
    outlet,
    isDishDirty,
    onClose,
    onUpdateDish,
    handleDishDragOver,
    handleDishDragLeave,
    handleDishDrop,
    draggingOverDishId,
    handleGenerateImage,
    regeneratingId,
    handleLocalImagePreview,
    expandedAddons,
    setExpandedAddons,
    handleDeleteDish,
    saveDish,
    isSaving,
}: DishEditModalProps) {
    if (!isOpen || !editingDishId) return null;

    const dish = dishes.find(d => d.dishId === editingDishId);
    if (!dish) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <div
                className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden overflow-hidden animate-in zoom-in-95 fade-in duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 px-6 py-5 flex items-center justify-between sticky top-0 z-[999]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-950 overflow-hidden border-2 border-white/10 flex-shrink-0">
                            {dish.previewUrl || dish.imageUrl ? (
                                <img src={dish.previewUrl || dish.imageUrl!} alt={dish.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <FiCamera size={16} className="text-slate-500 opacity-30" />
                                </div>
                            )}
                        </div>
                        <div>
                            <h2 className="text-white font-black tracking-tight leading-none mb-1">{dish.name || "Untitled Dish"}</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all">
                        <FiX size={20} />
                    </button>
                </div>

                <div className="p-6 md:p-8 space-y-8 pb-12">
                    {/* Image Management */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Visual Asset</label>
                        <div 
                            className={`aspect-video rounded-[1.5rem] border-2 border-dashed relative overflow-hidden transition-all group ${draggingOverDishId === dish.dishId ? 'border-indigo-600 bg-indigo-50 shadow-inner' : 'border-slate-100'}`}
                            onDragOver={(e) => handleDishDragOver(e, dish.dishId)}
                            onDragLeave={handleDishDragLeave}
                            onDrop={(e) => handleDishDrop(e, dish.dishId)}
                        >
                            {dish.previewUrl || dish.imageUrl ? (
                                <>
                                    <img src={dish.previewUrl || dish.imageUrl!} alt={dish.name} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02] ${regeneratingId === dish.dishId ? 'blur-sm' : ''}`} />
                                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm z-20 flex items-center justify-center gap-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <button onClick={() => handleGenerateImage(dish.dishId)} className="p-4 bg-white/10 hover:bg-white/30 text-white rounded-2xl backdrop-blur-md transition-all active:scale-95 shadow-xl cursor-pointer border border-white/10" title="Regenerate with AI">
                                            <FiRefreshCw size={24} className={regeneratingId === dish.dishId ? 'animate-spin' : ''} />
                                        </button>
                                        <label className="p-4 bg-white/10 hover:bg-white/30 text-white rounded-2xl backdrop-blur-md transition-all active:scale-95 shadow-xl cursor-pointer border border-white/10" title="Upload Custom Image">
                                            <FiUpload size={24} />
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleLocalImagePreview(dish.dishId, file); }} />
                                        </label>
                                        <button 
                                            onClick={() => {
                                                onUpdateDish(dish.dishId, "imageUrl", null);
                                                onUpdateDish(dish.dishId, "previewUrl", null);
                                                onUpdateDish(dish.dishId, "pendingImageFile", undefined);
                                                toast.success("Image removed", { icon: '🗑️' });
                                            }}
                                            className="p-4 bg-white/10 hover:bg-red-500/80 text-white rounded-2xl backdrop-blur-md transition-all active:scale-95 shadow-xl cursor-pointer border border-white/10" 
                                            title="Remove Image"
                                        >
                                            <FiTrash2 size={24} />
                                        </button>
                                    </div>
                                    {regeneratingId === dish.dishId && (
                                        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-pulse">
                                            <FiRefreshCw size={32} className="text-white animate-spin mb-4" />
                                            <span className="text-white font-black text-xs uppercase tracking-widest">AI is cooking...</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-50">
                                    <div className="w-16 h-16 bg-white rounded-3xl shadow-sm flex items-center justify-center">
                                        <FiCamera size={32} className="text-slate-200" />
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => handleGenerateImage(dish.dishId)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95 cursor-pointer">
                                            {regeneratingId === dish.dishId ? 'Generating...' : 'Generate with AI'}
                                        </button>
                                        <label className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest shadow-sm transition-all active:scale-95 cursor-pointer">
                                            Upload
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleLocalImagePreview(dish.dishId, file); }} />
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="relative group/input mt-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-4 bg-white px-2 z-10">Dish Name</label>
                        <input
                            className="w-full p-4 border border-slate-100 bg-slate-50 focus:bg-white rounded-[1rem] font-black text-slate-900 text-lg focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                            value={dish.name}
                            onChange={(e) => onUpdateDish(dish.dishId, "name", e.target.value)}
                            placeholder="Masala Dosa, Paneer Tikka..."
                        />
                    </div>

                    {/* Price + Portion */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative group/input">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-4 bg-white px-2 z-10">Price</label>
                            <span className="absolute left-4 top-4 text-slate-400 font-black text-lg">{outlet?.currency || '₹'}</span>
                            <input
                                className="w-full pl-10 p-4 border border-slate-100 bg-slate-50 focus:bg-white rounded-[1rem] font-black text-slate-900 text-lg focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                                type="number" value={dish.price || ""} onChange={(e) => onUpdateDish(dish.dishId, "price", e.target.value)} placeholder="0.00"
                            />
                        </div>
                        <div className="relative group/input">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-4 bg-white px-2 z-10">Portion</label>
                            <input
                                className="w-full p-4 border border-slate-100 bg-slate-50 focus:bg-white rounded-[1rem] font-bold text-slate-900 text-lg focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                                value={dish.weight || ""} onChange={(e) => onUpdateDish(dish.dishId, "weight", e.target.value)} placeholder="e.g. 250g"
                            />
                        </div>
                    </div>

                    {/* Variants */}
                    <div className="bg-slate-50/50 p-4 rounded-[1.5rem] border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing Variants (Size/Prep)</span>
                            <button type="button" onClick={() => { const nv = [...(dish.variants || []), { variantType: "", label: "", price: 0 }]; onUpdateDish(dish.dishId, "variants", nv); }} className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors flex items-center gap-1 cursor-pointer">
                                <FiPlus /> Add Variant
                            </button>
                        </div>
                        <div className="space-y-2">
                            {(dish.variants || []).map((variant, vIdx) => (
                                <div key={vIdx} className="flex gap-2 items-center animate-in slide-in-from-left-2 duration-300">
                                    <input placeholder="Type" className="w-[72px] shrink-0 p-3 border border-slate-100 bg-white rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-100" value={variant.variantType || ""} onChange={(e) => { const nv = [...dish.variants]; nv[vIdx].variantType = e.target.value; onUpdateDish(dish.dishId, "variants", nv); }} />
                                    <input placeholder="Label" className="flex-1 min-w-[60px] p-3 border border-slate-100 bg-white rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-100" value={variant.label} onChange={(e) => { const nv = [...dish.variants]; nv[vIdx].label = e.target.value; onUpdateDish(dish.dishId, "variants", nv); }} />
                                    <div className="w-24 relative shrink-0">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">{outlet?.currency}</span>
                                        <input placeholder="Price" type="number" className="w-full text-left p-3 pl-[1.6rem] border border-slate-100 bg-white rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-100" value={variant.price === 0 ? "" : variant.price} onChange={(e) => { const nv = [...dish.variants]; nv[vIdx].price = parseFloat(e.target.value) || 0; onUpdateDish(dish.dishId, "variants", nv); }} />
                                    </div>
                                    <button onClick={() => { const nv = [...dish.variants]; nv.splice(vIdx, 1); onUpdateDish(dish.dishId, "variants", nv); }} className="w-8 h-8 shrink-0 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors cursor-pointer"><FiX size={16} /></button>
                                </div>
                            ))}
                            {(dish.variants || []).length === 0 && (
                                <p className="text-[9px] text-slate-300 font-bold uppercase text-center py-2 italic">No variants (Single Price Dish)</p>
                            )}
                        </div>
                    </div>

                    {/* Add-ons */}
                    {dish.addons.length > 0 || expandedAddons[dish.dishId] ? (
                        <div className="bg-slate-50/50 p-4 rounded-[1.5rem] border border-slate-100 space-y-4 animate-in fade-in duration-300">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custom Add-ons</span>
                            <div className="flex flex-wrap gap-2">
                                {dish.addons.map((addon, aIdx) => (
                                    <div key={aIdx} className="bg-white border border-slate-200 pl-3 pr-1 py-1 rounded-full flex items-center gap-2 shadow-sm">
                                        <span className="text-xs font-bold text-slate-700">{addon.name}</span>
                                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{outlet?.currency}{addon.price}</span>
                                        <button onClick={() => { const na = [...dish.addons]; na.splice(aIdx, 1); onUpdateDish(dish.dishId, "addons", na); }} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors cursor-pointer"><FiX size={14} /></button>
                                    </div>
                                ))}
                                <div className="flex items-center gap-1 bg-slate-100/50 rounded-full pl-3 pr-1 py-1 group/add">
                                    <input id={`addon-name-${dish.dishId}`} placeholder="Name (e.g. Cheese)" className="bg-transparent border-none outline-none text-xs font-bold text-slate-600 w-28 placeholder:text-slate-300" onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById(`addon-price-${dish.dishId}`)?.focus(); }} />
                                    <span className="text-slate-300 font-bold border-l border-slate-200 pl-1">{outlet?.currency || '₹'}</span>
                                    <input id={`addon-price-${dish.dishId}`} placeholder="Price" type="number" className="bg-transparent border-none outline-none text-xs font-bold text-slate-600 w-16 placeholder:text-slate-300" onKeyDown={(e) => { if (e.key === 'Enter') { const ni = document.getElementById(`addon-name-${dish.dishId}`) as HTMLInputElement; const pi = e.currentTarget; const n = ni.value.trim(); const p = parseFloat(pi.value) || 0; if (n) { onUpdateDish(dish.dishId, "addons", [...dish.addons, { name: n, price: p }]); ni.value = ""; pi.value = ""; ni.focus(); toast.success(`Add-on "${n}" added!`, { icon: '➕', duration: 1500 }); } else { toast.error("Please enter an add-on name"); ni.focus(); } } }} />
                                    <button onClick={() => { const ni = document.getElementById(`addon-name-${dish.dishId}`) as HTMLInputElement; const pi = document.getElementById(`addon-price-${dish.dishId}`) as HTMLInputElement; if (!ni || !pi) return; const n = ni.value.trim(); const p = parseFloat(pi.value) || 0; if (n) { onUpdateDish(dish.dishId, "addons", [...dish.addons, { name: n, price: p }]); ni.value = ""; pi.value = ""; ni.focus(); toast.success(`Add-on "${n}" added!`, { icon: '➕', duration: 1500 }); } else { toast.error("Please enter an add-on name"); ni.focus(); } }} className="bg-indigo-600 hover:bg-indigo-700 text-white p-1 rounded-full opacity-40 group-hover/add:opacity-100 transition-opacity active:scale-95 flex-shrink-0 cursor-pointer">
                                        <FiPlus size={12} />
                                    </button>
                                </div>
                            </div>
                            <p className="text-[8px] font-bold text-slate-400 italic px-1">Tip: Add a name and price then press Enter or click +</p>
                        </div>
                    ) : (
                        <button onClick={() => setExpandedAddons(prev => ({ ...prev, [dish.dishId]: true }))} className="w-full py-4 border-2 border-dashed border-slate-100 rounded-[1.5rem] text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all cursor-pointer">
                            + Add Custom Add-ons
                        </button>
                    )}
                </div>

                {/* Sticky Footer Actions */}
                <div className="bg-white border-t border-slate-100 p-6 flex gap-4 sticky bottom-0 z-50">
                    <button onClick={() => handleDeleteDish(dish)} className="px-6 py-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex-1 cursor-pointer">
                        Delete Dish
                    </button>
                    <button onClick={(e) => saveDish(e, dish)} disabled={isSaving || !isDishDirty(dish)} className={`px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex-[2] shadow-xl active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${isDishDirty(dish) ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}`}>
                        {isSaving ? <FiRefreshCw className="animate-spin" /> : <><FiSave /> Save Changes</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import { FiSave, FiRefreshCw, FiArrowLeft, FiCamera, FiArrowRight, FiPlus, FiEdit2, FiTrash2, FiSearch, FiUpload } from "react-icons/fi";
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
    generationCount?: number;
}

interface Category {
    categoryId: string;
    categoryName: string;
    dishCount?: number;
    isPublished?: boolean;
}

interface OutletData {
    outletName: string;
    logoUrl: string | null;
    currency?: string;
}

export default function ManageMenu() {
    const { outletUid, categoryId: urlCategoryId } = useParams();
    const navigate = useNavigate();
    
    // Core Data State
    const [outlet, setOutlet] = useState<OutletData | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Category State
    const [categories, setCategories] = useState<Category[]>([]);
    const [catPage, setCatPage] = useState(1);
    const [totalCats, setTotalCats] = useState(0);
    const [catLimit] = useState(6);
    
    // Dish State
    const [dishes, setDishes] = useState<Dish[]>([]);
    const [dishPage, setDishPage] = useState(1);
    const [totalDishes, setTotalDishes] = useState(0);
    const [dishLimit] = useState(5);
    const [originalDishes, setOriginalDishes] = useState<Dish[]>([]); // For dirty check
    const [dishesLoading, setDishesLoading] = useState(false);
    
    // View State
    const [viewMode, setViewMode] = useState<'categories' | 'dishes'>(urlCategoryId ? 'dishes' : 'categories');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(urlCategoryId || null);

    // Sync state with URL
    useEffect(() => {
        if (urlCategoryId) {
            setSelectedCategoryId(urlCategoryId);
            setViewMode('dishes');
            setDishPage(1);
            setDishSearch("");
        } else {
            setSelectedCategoryId(null);
            setViewMode('categories');
        }
    }, [urlCategoryId]);
    
    // Modal & Action State
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newCategoryPublished, setNewCategoryPublished] = useState(true);
    
    // Action Loading States
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Search state (now representing the committed/debounced search value)
    const [catSearch, setCatSearch] = useState("");
    const [dishSearch, setDishSearch] = useState("");

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteConfirmData, setDeleteConfirmData] = useState<{
        type: 'category' | 'dish',
        id: string,
        name: string
    } | null>(null);

    useEffect(() => {
        if (outletUid) {
            fetchOutletInfo();
        }
    }, [outletUid]);

    useEffect(() => {
        if (viewMode === 'categories') {
            fetchCategories();
        }
    }, [viewMode, catSearch, catPage]);

    useEffect(() => {
        if (viewMode === 'dishes' && selectedCategoryId) {
            fetchDishes();
        }
    }, [viewMode, selectedCategoryId, dishSearch, dishPage]);

    const fetchOutletInfo = async () => {
        try {
            const res = await api.get(`/outlets/${outletUid}/menu`);
            setOutlet(res.data.outlet);
        } catch (error) {
            console.error("Failed to load outlet info");
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await api.get(`/outlets/${outletUid}/categories`, {
                params: { search: catSearch, page: catPage, limit: catLimit }
            });
            setCategories(res.data.categories.map((c: any) => ({
                categoryId: c.categoryId,
                categoryName: c.name || c.categoryName,
                isPublished: c.isPublished !== false,
                dishCount: c.dishCount || 0
            })));
            setTotalCats(res.data.total);
        } catch (error) {
            toast.error("Failed to load categories");
        }
    };

    const fetchDishes = async () => {
        if (!selectedCategoryId) return;
        setDishesLoading(true);
        try {
            const res = await api.get(`/outlets/${outletUid}/dishes`, {
                params: { 
                    categoryId: selectedCategoryId, 
                    search: dishSearch, 
                    page: dishPage, 
                    limit: dishLimit 
                }
            });
            setDishes(res.data.dishes);
            setOriginalDishes(JSON.parse(JSON.stringify(res.data.dishes)));
            setTotalDishes(res.data.total);
        } catch (error) {
            toast.error("Failed to load dishes");
        } finally {
            setDishesLoading(false);
        }
    };

    const handleUpdateDish = (dishId: string, field: keyof Dish, value: any) => {
        setDishes(prev => prev.map(d => 
            d.dishId === dishId ? { ...d, [field]: value } : d
        ));
    };

    const isDishDirty = (currentDish: Dish) => {
        const origDish = originalDishes.find(d => d.dishId === currentDish.dishId);
        if (origDish) {
            return origDish.name !== currentDish.name ||
                Number(origDish.price) !== Number(currentDish.price) ||
                origDish.weight !== currentDish.weight ||
                origDish.description !== currentDish.description;
        }
        return currentDish.requestId === 'manual' && !currentDish.dishId.startsWith('temp_');
    };

    const saveDish = async (dish: Dish) => {
        setIsSaving(true);
        try {
            await api.put(`/dishes/${dish.dishId}`, {
                name: dish.name,
                price: dish.price,
                weight: dish.weight,
                description: dish.description
            });
            setOriginalDishes(originalDishes.map(d => d.dishId === dish.dishId ? { ...dish } : d));
            toast.success("Saved!");
        } catch (e) {
            toast.error("Failed to save");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteDish = (dishId: string) => {
        const dish = dishes.find(d => d.dishId === dishId);
        if (dish) {
            setDeleteConfirmData({ type: 'dish', id: dishId, name: dish.name });
            setIsDeleteModalOpen(true);
        }
    };

    const handleAddCategory = async () => {
        try {
            setIsSaving(true);
            await api.post(`/outlets/${outletUid}/categories`, null, {
                params: { 
                    name: newCategoryName,
                    isPublished: newCategoryPublished
                }
            });
            fetchCategories();
            setIsCategoryModalOpen(false);
            setNewCategoryName("");
            setNewCategoryPublished(true);
            toast.success("Category added!");
        } catch (e) {
            toast.error("Failed to add category");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateCategory = async () => {
        try {
            if (!editingCategory) return;
            setIsSaving(true);
            await api.put(`/categories/${editingCategory.categoryId}`, null, {
                params: { 
                    name: newCategoryName,
                    isPublished: newCategoryPublished
                }
            });
            fetchCategories();
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
            setNewCategoryName("");
            setNewCategoryPublished(true);
            toast.success("Category updated!");
        } catch (e) {
            toast.error("Failed to update category");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCategory = (catId: string) => {
        const category = categories.find(c => c.categoryId === catId);
        if (category) {
            setDeleteConfirmData({ type: 'category', id: catId, name: category.categoryName });
            setIsDeleteModalOpen(true);
        }
    };

    const confirmDelete = async () => {
        if (!deleteConfirmData) return;
        setIsDeleting(true);
        try {
            if (deleteConfirmData.type === 'category') {
                await api.delete(`/categories/${deleteConfirmData.id}`);
                setCategories(categories.filter(cat => cat.categoryId !== deleteConfirmData.id));
                setTotalCats(prev => prev - 1);
                toast.success(`${deleteConfirmData.name} deleted successfully!`);
            } else {
                await api.delete(`/dishes/${deleteConfirmData.id}`);
                setDishes(dishes.filter(d => d.dishId !== deleteConfirmData.id));
                setOriginalDishes(originalDishes.filter(d => d.dishId !== deleteConfirmData.id));
                setTotalDishes(prev => prev - 1);
                toast.success(`${deleteConfirmData.name} removed from your menu.`);
            }
            setIsDeleteModalOpen(false);
        } catch (e) {
            toast.error(`Failed to delete ${deleteConfirmData.type}`);
        } finally {
            setIsDeleting(false);
            setDeleteConfirmData(null);
        }
    };

    const renderDeleteModal = () => (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isDeleteModalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isDeleting && setIsDeleteModalOpen(false)}></div>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-br from-red-500 to-red-600 p-8 text-white text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                        <FiTrash2 size={40} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-black tracking-tight">Delete {deleteConfirmData?.type === 'category' ? 'Category' : 'Dish'}?</h3>
                </div>
                <div className="p-8 text-center pt-10">
                    <p className="text-slate-600 font-medium mb-2">Are you sure you want to delete <span className="font-black text-slate-900 underline block mt-1">"{deleteConfirmData?.name}"</span></p>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest bg-red-50 py-2 rounded-lg">Action cannot be undone</p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-10">
                        <button
                            disabled={isDeleting}
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl font-black transition-all active:scale-95 border border-slate-100 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={isDeleting}
                            onClick={confirmDelete}
                            className="py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-100 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isDeleting ? <FiRefreshCw className="animate-spin" /> : "Delete"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const handleAddManualDish = async (catId: string) => {
        try {
            const res = await api.post(`/outlets/${outletUid}/dishes`, {
                categoryId: catId,
                name: "New Dish",
                price: 0,
                description: ""
            });
            const newDish: Dish = {
                dishId: res.data.dishId,
                requestId: 'manual',
                name: res.data.name,
                price: res.data.price,
                weight: null,
                description: "",
                imageUrl: null
            };
            setDishes([newDish, ...dishes]);
            setOriginalDishes([newDish, ...originalDishes]);
            setTotalDishes(prev => prev + 1);
            toast.success("Dish added! Edit the details above.");
        } catch (e) {
            toast.error("Failed to add dish");
        }
    };

    const handleGenerateImage = async (dishId: string) => {
        const dish = dishes.find(d => d.dishId === dishId);
        if (!dish || !dish.requestId) {
            toast.error("Cannot generate: Missing request context");
            return;
        }
        setRegeneratingId(dishId);
        try {
            const res = await api.post(`/requests/${dish.requestId}/generate-image/${dishId}`);
            setDishes(prev => prev.map(d => d.dishId === dishId ? { ...d, imageUrl: res.data.imageUrl, generationCount: (d.generationCount || 0) + 1, imageStatus: 'ready' } : d));
            toast.success("AI Image Generated!");
        } catch (e) {
            toast.error("Generation failed");
        } finally {
            setRegeneratingId(null);
        }
    };

    const handleManualImageUpload = async (dishId: string, file: File) => {
        try {
            setRegeneratingId(dishId);
            const formData = new FormData();
            formData.append('file', file);
            
            const res = await api.post(`/dishes/${dishId}/upload-image`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setDishes(prev => prev.map(d => d.dishId === dishId ? { ...d, imageUrl: res.data.imageUrl, imageStatus: 'ready' } : d));
            toast.success("Image uploaded!");
        } catch (error) {
            toast.error("Upload failed");
        } finally {
            setRegeneratingId(null);
        }
    };


    const renderCategoryModal = () => (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isCategoryModalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCategoryModalOpen(false)}></div>
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
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                    </div>
                    <div className="mb-8">
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Status</label>
                        <button
                            onClick={() => setNewCategoryPublished(!newCategoryPublished)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                                newCategoryPublished 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                        >
                            <span className="font-bold">{newCategoryPublished ? 'Published' : 'Draft'}</span>
                            <div className={`w-12 h-6 rounded-full relative transition-colors ${newCategoryPublished ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newCategoryPublished ? 'left-7' : 'left-1'}`} />
                            </div>
                        </button>
                    </div>

                    <button
                        onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
                        disabled={isSaving || !newCategoryName.trim()}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-lg shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                        {isSaving ? <FiRefreshCw className="animate-spin" /> : editingCategory ? "Update Category" : "Create Category"}
                    </button>
                </div>
            </div>
        </div>
    );

    const SearchInput = ({ initialValue, onSearch, placeholder }: { initialValue: string, onSearch: (v: string) => void, placeholder: string }) => {
        const [localValue, setLocalValue] = useState(initialValue);
        
        useEffect(() => {
            const timer = setTimeout(() => {
                onSearch(localValue);
            }, 500);
            return () => clearTimeout(timer);
        }, [localValue, onSearch]);

        return (
            <div className="relative flex-1">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    placeholder={placeholder}
                    className="w-full pl-10 pr-4 py-3 md:py-4 bg-white/50 backdrop-blur-md border border-slate-100 rounded-[1rem] md:rounded-[1.5rem] font-bold text-slate-900 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                />
            </div>
        );
    };

    const renderCategories = () => (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">Menu Categories</h2>
                    <p className="text-slate-500 font-medium text-sm md:text-base">Manage how your dishes are grouped.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8 md:mb-12">
                    <div className="relative w-full sm:w-80">
                         <SearchInput 
                            placeholder="Find a category..."
                            initialValue={catSearch}
                            onSearch={(val) => {
                                setCatSearch(val);
                                setCatPage(1);
                            }}
                         />
                    </div>
                    <button
                        onClick={() => {
                            setEditingCategory(null);
                            setNewCategoryName("");
                            setNewCategoryPublished(true);
                            setIsCategoryModalOpen(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
                    >
                        <FiPlus size={20} /> Add Category
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                {categories.map((category, idx) => (
                    <div
                        key={category.categoryId}
                        className="bg-white/90 backdrop-blur-md rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-white group hover:-translate-y-2 transition-all duration-500 animate-in slide-in-from-bottom-8"
                        style={{ animationDelay: `${idx * 100}ms` }}
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
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setEditingCategory(category);
                                        setNewCategoryName(category.categoryName);
                                        setNewCategoryPublished(category.isPublished !== false);
                                        setIsCategoryModalOpen(true);
                                    }}
                                    className="p-3 bg-slate-50 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                                >
                                    <FiEdit2 />
                                </button>
                                <button
                                    onClick={() => handleDeleteCategory(category.categoryId)}
                                    className="p-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors cursor-pointer"
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-2xl font-black text-slate-900 mb-2 truncate">{category.categoryName}</h3>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8">
                            {category.dishCount || 0} {(category.dishCount || 0) === 1 ? 'Dish' : 'Dishes'}
                        </p>

                        <button
                            onClick={() => {
                                navigate(`/manage-menu/${outletUid}/category/${category.categoryId}`);
                                window.scrollTo(0, 0);
                            }}
                            className="w-full py-4 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 text-slate-900 cursor-pointer"
                        >
                            Manage Dishes <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                ))}

                {categories.length === 0 && (
                    <div className="col-span-full py-20 bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-6">
                            <FiPlus size={32} />
                        </div>
                        <h4 className="text-2xl font-black text-slate-900">{catSearch ? "No matching categories" : "No Categories Yet"}</h4>
                        <p className="text-slate-500 mt-2 max-w-xs px-4">
                            {catSearch ? "Try a different search term." : "Start by creating your first category to organize your menu items."}
                        </p>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {totalCats > catLimit && (
                <div className="flex items-center justify-center gap-4 mt-8">
                    <button 
                        disabled={catPage === 1}
                        onClick={() =>setCatPage(prev => prev - 1)}
                        className="p-4 bg-white rounded-2xl shadow-lg border border-slate-100 disabled:opacity-30 active:scale-90 transition-all font-black cursor-pointer disabled:cursor-not-allowed"
                    >
                        <FiArrowLeft />
                    </button>
                    <span className="font-black text-slate-900">Page {catPage} of {Math.ceil(totalCats/catLimit)}</span>
                    <button 
                        disabled={catPage >= Math.ceil(totalCats/catLimit)}
                        onClick={() => setCatPage(prev => prev + 1)}
                        className="p-4 bg-white rounded-2xl shadow-lg border border-slate-100 disabled:opacity-30 active:scale-90 transition-all font-black cursor-pointer disabled:cursor-not-allowed"
                    >
                        <FiArrowRight />
                    </button>
                </div>
            )}
        </div>
    );

    const renderDishes = () => {
        const category = categories.find(c => c.categoryId === selectedCategoryId);
        
        return (
            <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 md:gap-6">
                        <div>
                            <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter leading-tight">{category?.categoryName || 'Dishes'}</h2>
                            <p className="text-slate-500 font-medium text-xs md:text-sm">{totalDishes} items found</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="relative flex-1 sm:w-64">
                             <SearchInput 
                                placeholder="Search dishes..."
                                initialValue={dishSearch}
                                onSearch={(val) => {
                                    setDishSearch(val);
                                    setDishPage(1);
                                }}
                             />
                        </div>
                        <button
                            onClick={() => handleAddManualDish(selectedCategoryId!)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
                        >
                            <FiPlus size={20} /> Add Dish
                        </button>
                    </div>
                </div>

                <div className="grid gap-4 md:gap-8">
                    {dishes.map((dish, dishIdx) => (
                        <div
                            key={dish.dishId}
                            className={`flex flex-col lg:flex-row gap-6 md:gap-8 p-5 md:p-8 bg-white/90 backdrop-blur-md rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border transition-all duration-500 group animate-in fade-in slide-in-from-bottom-4 ${isDishDirty(dish) ? 'border-indigo-200 ring-2 ring-indigo-50 shadow-indigo-100' : 'border-white'}`}
                            style={{ animationDelay: `${dishIdx * 50}ms` }}
                        >
                            {/* Image Section */}
                            <div className="w-full lg:w-[40%] flex flex-col gap-4">
                                <div className="w-full aspect-[4/3] sm:aspect-video lg:aspect-square bg-slate-950 rounded-[2rem] overflow-hidden relative group/img shadow-2xl border-4 border-white">
                                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                                    
                                    {dish.imageUrl ? (
                                        <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover z-10 relative transition-transform duration-700 group-hover/img:scale-110" />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 z-10">
                                            <FiCamera size={48} className="mb-4 opacity-20" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">No Visualized Image</span>
                                        </div>
                                    )}

                                    {/* Action Overlays */}
                                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm opacity-0 group-hover/img:opacity-100 transition-all duration-500 z-20 flex flex-col items-center justify-center gap-4">
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => handleGenerateImage(dish.dishId)}
                                                className="p-4 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-2xl text-white transition-all active:scale-95 group/btn cursor-pointer"
                                                title="Generate AI Image"
                                            >
                                                <FiRefreshCw className={regeneratingId === dish.dishId ? "animate-spin" : ""} size={24} />
                                            </button>
                                            <label className="p-4 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-2xl text-white transition-all active:scale-95 cursor-pointer group/btn" title="Upload Manual Image">
                                                <FiUpload size={24} />
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleManualImageUpload(dish.dishId, file);
                                                    }}
                                                />
                                            </label>
                                            <button
                                                onClick={() => handleDeleteDish(dish.dishId)}
                                                className="p-4 bg-red-500/80 hover:bg-red-600/90 backdrop-blur-md rounded-2xl text-white transition-all active:scale-95 cursor-pointer"
                                                title="Delete Dish"
                                            >
                                                <FiTrash2 size={24} />
                                            </button>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Manage Visuals & Status</span>
                                    </div>

                                    {regeneratingId === dish.dishId && (
                                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl flex flex-col items-center justify-center text-white z-30">
                                            <FiRefreshCw className="animate-spin text-4xl mb-4 text-blue-400" />
                                            <span className="font-black tracking-[0.2em] text-[10px] uppercase animate-pulse">Crafting Artwork...</span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Quick Stats / Badges */}
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${dish.imageUrl ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`}></span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{dish.imageUrl ? 'AI Visualized' : 'Visual Pending'}</span>
                                    </div>
                                    {isDishDirty(dish) && (
                                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">Unsaved Changes</span>
                                    )}
                                </div>
                            </div>

                            {/* Edit Details Section */}
                            <div className="flex-1 flex flex-col justify-between space-y-6">
                                <div className="space-y-6">
                                    <div className="relative group/input">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-4 bg-white px-2 z-10 transition-colors group-focus-within/input:text-slate-900">Dish Name</label>
                                        <input
                                            className="w-full p-4 md:p-5 border border-slate-100 bg-slate-50 focus:bg-white rounded-[1rem] md:rounded-[1.5rem] font-black text-slate-900 text-xl md:text-2xl focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                                            value={dish.name}
                                            onChange={(e) => handleUpdateDish(dish.dishId, "name", e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                        <div className="relative group/input">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-4 bg-white px-2 z-10 transition-colors group-focus-within/input:text-slate-900">Price</label>
                                            <span className="absolute left-4 top-4 md:left-5 md:top-5 text-slate-400 font-black text-lg md:text-xl">{outlet?.currency || '₹'}</span>
                                            <input
                                                className="w-full pl-10 md:pl-12 p-4 md:p-5 border border-slate-100 bg-slate-50 focus:bg-white rounded-[1rem] md:rounded-[1.5rem] font-black text-slate-900 text-lg md:text-xl focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                                                type="number"
                                                value={dish.price || ""}
                                                onChange={(e) => handleUpdateDish(dish.dishId, "price", e.target.value)}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="relative group/input">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-4 bg-white px-2 z-10 transition-colors group-focus-within/input:text-slate-900">Portion</label>
                                            <input
                                                className="w-full p-4 md:p-5 border border-slate-100 bg-slate-50 focus:bg-white rounded-[1rem] md:rounded-[1.5rem] font-bold text-slate-900 text-lg md:text-xl focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                                                value={dish.weight || ""}
                                                onChange={(e) => handleUpdateDish(dish.dishId, "weight", e.target.value)}
                                                placeholder="e.g. 250g"
                                            />
                                        </div>
                                    </div>

                                    <div className="relative group/input h-full">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-4 bg-white px-2 z-10 transition-colors group-focus-within/input:text-slate-900">Description</label>
                                        <textarea
                                            className="w-full p-4 md:p-5 border border-slate-100 bg-slate-50 focus:bg-white rounded-[1rem] md:rounded-[1.5rem] text-slate-600 font-medium h-24 md:h-32 min-h-[100px] resize-none focus:ring-4 focus:ring-slate-100 outline-none transition-all leading-relaxed text-sm md:text-base"
                                            value={dish.description || ""}
                                            onChange={(e) => handleUpdateDish(dish.dishId, "description", e.target.value)}
                                            placeholder="Tell your customers about this masterpiece..."
                                            rows={4}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end pt-2 md:pt-4">

                                    <button
                                        onClick={() => saveDish(dish)}
                                        disabled={!isDishDirty(dish) || isSaving}
                                        className={`w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-base md:text-lg transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl ${isDishDirty(dish)
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100 cursor-pointer'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                    >
                                        {isSaving ? <FiRefreshCw className="animate-spin" /> : <FiSave />}
                                        <span>{isDishDirty(dish) ? "Save" : "Saved"}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {dishesLoading && (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">Syncing Dishes...</p>
                        </div>
                    )}
                    
                    {!dishesLoading && dishes.length === 0 && (
                        <div className="py-20 bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                            <FiPlus className="text-slate-300 mb-4" size={48} />
                            <h4 className="text-2xl font-black text-slate-900">{dishSearch ? "No matching dishes" : "Clean Slate"}</h4>
                            <p className="text-slate-500 mt-2 max-w-xs px-4">
                                {dishSearch ? "Try a different search term." : "This category is empty. Let's add some delicious dishes! 🍽️"}
                            </p>
                        </div>
                    )}
                </div>

                {/* Pagination for Dishes */}
                {totalDishes > dishLimit && (
                    <div className="flex items-center justify-center gap-4 mt-8">
                        <button 
                            disabled={dishPage === 1}
                            onClick={() =>setDishPage(prev => prev - 1)}
                            className="p-4 bg-white rounded-2xl shadow-lg border border-slate-100 disabled:opacity-30 active:scale-90 transition-all font-black"
                        >
                            <FiArrowLeft />
                        </button>
                        <span className="font-black text-slate-900">Page {dishPage} of {Math.ceil(totalDishes/dishLimit)}</span>
                        <button 
                            disabled={dishPage >= Math.ceil(totalDishes/dishLimit)}
                            onClick={() => setDishPage(prev => prev + 1)}
                            className="p-4 bg-white rounded-2xl shadow-lg border border-slate-100 disabled:opacity-30 active:scale-90 transition-all font-black"
                        >
                            <FiArrowRight />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4" />
            <p className="font-black text-slate-900 animate-pulse tracking-widest text-xs uppercase">Loading Your Menu</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-20 relative">
            {/* Background Decorations */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-slate-200/40 blur-3xl"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/40 blur-3xl"></div>
            </div>

            {/* Header / Breadcrumbs */}
            <div className="relative z-30 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 md:gap-3 bg-white/90 backdrop-blur-xl shadow-lg border border-white/50 p-2 md:p-3 px-6 md:px-8 rounded-full pointer-events-auto max-w-[98vw]">
                    <div className="flex items-center gap-2 overflow-hidden text-[10px] md:text-sm font-bold tracking-tight">
                        <span className="text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors shrink-0" onClick={() => navigate('/dashboard')}>Dashboard</span>
                        <span className="text-slate-300 shrink-0">/</span>
                        <span 
                            className={`${viewMode === 'dishes' ? 'text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors' : 'text-slate-900'} shrink-0`}
                            onClick={() => { if (viewMode === 'dishes') navigate(`/manage-menu/${outletUid}`); }}
                        >
                            Menu
                        </span>
                        {viewMode === 'dishes' && (
                            <>
                                <span className="text-slate-300 shrink-0">/</span>
                                <span className="text-slate-900 truncate">
                                    {categories.find(c => c.categoryId === selectedCategoryId)?.categoryName || 'Dishes'}
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <div />
            </div>

            {/* Main Content Area */}
            <div className="max-w-6xl mx-auto px-4 md:px-6 mt-8 md:mt-12 relative z-10 pb-24">
                {/* Configuration Shortcut Cards - Only show in Categories mode */}

                {/* Switchable View Content */}
                {viewMode === 'categories' ? renderCategories() : renderDishes()}
            </div>

            {renderCategoryModal()}
            {renderDeleteModal()}
        </div>
    );
}

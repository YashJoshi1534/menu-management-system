import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import { FiSave, FiRefreshCw, FiArrowLeft, FiCamera, FiArrowRight, FiPlus, FiEdit2, FiTrash2, FiSearch, FiUpload, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import Breadcrumb from "../components/Breadcrumb";
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItemWrapper({ id, disabled, children }: { id: string, disabled?: boolean, children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative' as const,
        opacity: isDragging ? 0.8 : 1,
    };
    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <div className={`relative h-full ${!disabled ? 'cursor-grab active:cursor-grabbing' : ''}`} {...(!disabled ? listeners : {})}>
                 {children}
            </div>
        </div>
    );
}

interface Addon {
    name: string;
    price: number;
}

interface Variant {
    variantType?: string;
    label: string;
    price: number;
}

interface Dish {
    dishId: string;
    requestId: string;
    name: string;
    price: number | null;
    weight: string | null;
    description: string | null;
    imageUrl: string | null;
    imageStatus?: string;
    generationCount?: number;
    pendingImageFile?: File;
    previewUrl?: string;
    variants: Variant[];
    addons: Addon[];
}

interface Category {
    categoryId: string;
    categoryName: string;
    dishCount?: number;
    isPublished?: boolean;
}

interface OutletData {
    storeName: string;
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

    // Sync state with URL only when urlCategoryId changes
    useEffect(() => {
        if (urlCategoryId) {
            // Only reset if we are actually switching categories
            if (selectedCategoryId !== urlCategoryId) {
                console.log("Category changed from URL:", urlCategoryId);
                setSelectedCategoryId(urlCategoryId);
                setViewMode('dishes');
                setDishPage(1);
                setDishSearch("");
            }
        } else {
            setSelectedCategoryId(null);
            setViewMode('categories');
        }
    }, [urlCategoryId, selectedCategoryId]);
    
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

    const [draggingOverDishId, setDraggingOverDishId] = useState<string | null>(null);
    const [expandedAddons, setExpandedAddons] = useState<Record<string, boolean>>({});

    const [isReorderingCats, setIsReorderingCats] = useState(false);
    const [isReorderingDishes, setIsReorderingDishes] = useState(false);
    
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleCatSearch = useCallback((val: string) => {
        setCatSearch(val);
        setCatPage(1);
    }, []);

    const handleDishSearch = useCallback((val: string) => {
        setDishSearch(val);
        setDishPage(1);
    }, []);

    const toggleReorderCats = async () => {
        if (isReorderingCats) {
            try {
                setIsSaving(true);
                const items = categories.map((c, i) => ({ id: c.categoryId, order: i }));
                await api.put(`/outlets/${outletUid}/categories/reorder`, items);
                toast.success("Category order saved!");
            } catch (e) {
                toast.error("Failed to save order");
            } finally {
                setIsSaving(false);
            }
            setIsReorderingCats(false);
            fetchCategories(); // will fetch normally
        } else {
            try {
                setLoading(true);
                const res = await api.get(`/outlets/${outletUid}/categories`, {
                    params: { search: catSearch, page: 1, limit: -1 }
                });
                setCategories(res.data.categories.map((c: any) => ({
                    categoryId: c.categoryId,
                    categoryName: c.name || c.categoryName,
                    isPublished: c.isPublished !== false,
                    dishCount: c.dishCount || 0
                })));
                setIsReorderingCats(true);
            } catch (e) {
                toast.error("Failed to enter reorder mode");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDragEndCategories = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setCategories((items) => {
                const oldIndex = items.findIndex((i) => i.categoryId === active.id);
                const newIndex = items.findIndex((i) => i.categoryId === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const toggleReorderDishes = async () => {
        if (isReorderingDishes) {
            try {
                setIsSaving(true);
                const items = dishes.map((d, i) => ({ id: d.dishId, order: i }));
                await api.put(`/outlets/${outletUid}/dishes/reorder`, items);
                toast.success("Dish order saved!");
            } catch (e) {
                toast.error("Failed to save order");
            } finally {
                setIsSaving(false);
            }
            setIsReorderingDishes(false);
            fetchDishes();
        } else {
            try {
                setDishesLoading(true);
                const res = await api.get(`/outlets/${outletUid}/dishes`, {
                    params: { categoryId: selectedCategoryId, search: dishSearch, page: 1, limit: -1 }
                });
                setDishes(res.data.dishes.map((d: any) => ({ ...d, addons: d.addons || [] })));
                setIsReorderingDishes(true);
            } catch (e) {
                toast.error("Failed to enter reorder mode");
            } finally {
                setDishesLoading(false);
            }
        }
    };

    const handleDragEndDishes = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setDishes((items) => {
                const oldIndex = items.findIndex((i) => i.dishId === active.id);
                const newIndex = items.findIndex((i) => i.dishId === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const fetchOutletInfo = useCallback(async () => {
        try {
            const res = await api.get(`/outlets/${outletUid}/menu`);
            setOutlet(res.data.outlet);
        } catch (error) {
            console.error("Failed to load outlet info");
        } finally {
            setLoading(false);
        }
    }, [outletUid]);

    const fetchCategories = useCallback(async () => {
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
    }, [outletUid, catSearch, catPage, catLimit]);

    const fetchDishes = useCallback(async () => {
        if (!selectedCategoryId || !outletUid) return;
        setDishesLoading(true);
        // Immediate scroll to top when page changes
        window.scrollTo({ top: 0, behavior: 'smooth' });
        try {
            console.log(`FETCHING DISHES: Page ${dishPage}, Limit ${dishLimit}`);
            const res = await api.get(`/outlets/${outletUid}/dishes`, {
                params: { 
                    categoryId: selectedCategoryId, 
                    search: dishSearch, 
                    page: dishPage, 
                    limit: dishLimit 
                }
            });
            console.log("FETCH SUCCESS:", { 
                count: res.data.dishes.length, 
                total: res.data.total, 
                page: res.data.page 
            });
            setDishes(res.data.dishes.map((d: any) => ({
                ...d,
                addons: d.addons || []
            })));
            setOriginalDishes(JSON.parse(JSON.stringify(res.data.dishes.map((d: any) => ({
                ...d,
                addons: d.addons || []
            })))));
            setTotalDishes(res.data.total);
        } catch (error) {
            toast.error("Failed to load dishes");
        } finally {
            setDishesLoading(false);
        }
    }, [selectedCategoryId, outletUid, dishPage, dishLimit, dishSearch]);

    useEffect(() => {
        if (outletUid) {
            fetchOutletInfo();
        }
    }, [outletUid, fetchOutletInfo]);

    useEffect(() => {
        if (viewMode === 'categories') {
            fetchCategories();
        }
    }, [viewMode, fetchCategories]);

    useEffect(() => {
        if (viewMode === 'dishes' && selectedCategoryId) {
            fetchDishes();
        }
    }, [viewMode, selectedCategoryId, fetchDishes]);

    const handleUpdateDish = (dishId: string, field: keyof Dish, value: any) => {
        setDishes(prev => prev.map(d => 
            d.dishId === dishId ? { ...d, [field]: value } : d
        ));
    };

    const isDishDirty = (currentDish: Dish) => {
        const origDish = originalDishes.find(d => d.dishId === currentDish.dishId);
        
        // Helper to treat null and "" as equivalent
        const normalize = (val: any) => (val === null || val === undefined) ? "" : String(val).trim();

        if (currentDish.pendingImageFile) return true;

        if (origDish) {
            const nameChanged = normalize(origDish.name) !== normalize(currentDish.name);
            const priceChanged = Number(origDish.price) !== Number(currentDish.price);
            const weightChanged = normalize(origDish.weight) !== normalize(currentDish.weight);
            const descChanged = normalize(origDish.description) !== normalize(currentDish.description);

            const variantsChanged = JSON.stringify(origDish.variants) !== JSON.stringify(currentDish.variants);
            const addonsChanged = JSON.stringify(origDish.addons) !== JSON.stringify(currentDish.addons);

            return nameChanged || priceChanged || weightChanged || descChanged || addonsChanged || variantsChanged;
        }
        return currentDish.requestId === 'manual' && !currentDish.dishId.startsWith('temp_');
    };

    const saveDish = async (e: React.MouseEvent, dish: Dish) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Saving dish:", dish.dishId);
        setIsSaving(true);
        try {
            let finalImageUrl = dish.imageUrl;

            // Step 1: Upload image if pending
            if (dish.pendingImageFile) {
                console.log("Uploading pending image...");
                const formData = new FormData();
                formData.append('file', dish.pendingImageFile);
                const uploadRes = await api.post(`/dishes/${dish.dishId}/upload-image`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                finalImageUrl = uploadRes.data.imageUrl;
            }

            // Step 2: Save Metadata
            const updatePayload = {
                name: dish.name,
                price: (dish.price as any) === "" ? 0 : Number(dish.price),
                weight: dish.weight,
                description: dish.description,
                imageUrl: finalImageUrl,
                addons: dish.addons,
                variants: dish.variants
            };

            const res = await api.put(`/dishes/${dish.dishId}`, updatePayload);
            
            // Sync state using the actual server response
            const updatedDish = { ...res.data, pendingImageFile: undefined, previewUrl: undefined };
            
            setOriginalDishes(prev => prev.map(d => d.dishId === dish.dishId ? updatedDish : d));
            setDishes(prev => prev.map(d => d.dishId === dish.dishId ? updatedDish : d));
            
            console.log("Save Success:", res.data);
            toast.success("Saved!");
        } catch (e: any) {
            console.error("Save Error Detail:", e.response?.data || e.message);
            toast.error(e.response?.data?.detail || "Failed to save");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteDish = (dish: Dish) => {
        setDeleteConfirmData({ type: 'dish', id: dish.dishId, name: dish.name });
        setIsDeleteModalOpen(true);
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
            
            if (catPage === 1) {
                fetchCategories();
            } else {
                setCatPage(1);
            }
            
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

    const handleDeleteCategory = (category: Category) => {
        setDeleteConfirmData({ type: 'category', id: category.categoryId, name: category.categoryName });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmData) return;
        setIsDeleting(true);
        try {
            if (deleteConfirmData.type === 'category') {
                await api.delete(`/categories/${deleteConfirmData.id}`);
                setCategories(prev => prev.filter(cat => cat.categoryId !== deleteConfirmData.id));
                setTotalCats(prev => prev - 1);
                toast.success(`${deleteConfirmData.name} deleted successfully!`);
            } else {
                await api.delete(`/dishes/${deleteConfirmData.id}`);
                setDishes(prev => prev.filter(d => d.dishId !== deleteConfirmData.id));
                setOriginalDishes(prev => prev.filter(d => d.dishId !== deleteConfirmData.id));
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

    const handleAddManualDish = async (catId: string, parentId?: string) => {
        try {
            const isVariant = !!parentId;
            await api.post(`/outlets/${outletUid}/dishes`, {
                categoryId: catId,
                name: isVariant ? "New Variant" : "New Dish",
                price: 0,
                description: "",
                isVariant: isVariant,
                parentId: parentId || null,
                variantLabel: isVariant ? "New" : null
            });
            
            // Re-fetch to ensure sync
            fetchDishes();
            toast.success(isVariant ? "Variant added!" : "Dish added!");
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

    const handleLocalImagePreview = (dishId: string, file: File) => {
        const previewUrl = URL.createObjectURL(file);
        setDishes(prev => prev.map(d => d.dishId === dishId ? { ...d, pendingImageFile: file, previewUrl } : d));
    };

    const handleDishDragOver = (e: React.DragEvent, dishId: string) => {
        e.preventDefault();
        setDraggingOverDishId(dishId);
    };

    const handleDishDragLeave = () => {
        setDraggingOverDishId(null);
    };

    const handleDishDrop = (e: React.DragEvent, dishId: string) => {
        e.preventDefault();
        setDraggingOverDishId(null);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
            handleLocalImagePreview(dishId, file);
        } else if (file) {
            toast.error("Please drop an image file.");
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
        const lastEmittedValue = useRef(initialValue);
        
        useEffect(() => {
            if (localValue === lastEmittedValue.current) return;

            const timer = setTimeout(() => {
                lastEmittedValue.current = localValue;
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
                            onSearch={handleCatSearch}
                         />
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto">
                        <button
                            onClick={toggleReorderCats}
                            disabled={isSaving}
                            className={`px-6 md:px-8 py-3 md:py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all flex border border-slate-200 items-center justify-center gap-2 md:gap-3 cursor-pointer ${isReorderingCats ? 'bg-amber-500 hover:bg-amber-600 text-white border-none' : 'bg-white hover:bg-slate-50 text-slate-900'}`}
                        >
                            {isReorderingCats ? (isSaving ? <FiRefreshCw className="animate-spin" /> : "Save Order") : "Reorder"}
                        </button>
                        {!isReorderingCats && (
                            <button
                                onClick={() => {
                                    setEditingCategory(null);
                                    setNewCategoryName("");
                                    setNewCategoryPublished(true);
                                    setIsCategoryModalOpen(true);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 md:gap-3 cursor-pointer"
                            >
                                <FiPlus size={20} /> Add Category
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndCategories}>
                <SortableContext items={categories.map(c => c.categoryId)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 relative min-h-[200px]">
                        {categories.map((category, idx) => (
                            <SortableItemWrapper key={category.categoryId} id={category.categoryId} disabled={!isReorderingCats}>
                                <div
                                    className="h-full bg-white/90 backdrop-blur-md rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-white group hover:-translate-y-2 transition-all duration-500 animate-in slide-in-from-bottom-8"
                                    style={!isReorderingCats ? { animationDelay: `${idx * 100}ms` } : {}}
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
                                                onClick={() => handleDeleteCategory(category)}
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
                                        disabled={isReorderingCats}
                                        className="w-full mt-auto py-4 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 text-slate-900 cursor-pointer disabled:opacity-50"
                                    >
                                        Manage Dishes <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </SortableItemWrapper>
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
                </SortableContext>
            </DndContext>

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
                                onSearch={handleDishSearch}
                             />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={toggleReorderDishes}
                                disabled={isSaving}
                                className={`px-5 py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all flex border border-slate-200 items-center justify-center gap-2 cursor-pointer ${isReorderingDishes ? 'bg-amber-500 hover:bg-amber-600 text-white border-none' : 'bg-white hover:bg-slate-50 text-slate-900'}`}
                            >
                                {isReorderingDishes ? (isSaving ? <FiRefreshCw className="animate-spin" /> : "Save Order") : "Reorder"}
                            </button>
                            {!isReorderingDishes && (
                                <button
                                    onClick={() => handleAddManualDish(selectedCategoryId!)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
                                >
                                    <FiPlus size={20} /> Add Dish
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndDishes}>
                    <SortableContext items={dishes.map(d => d.dishId)} strategy={verticalListSortingStrategy}>
                        <div className="grid gap-4 md:gap-8 relative min-h-[400px]">
                    {dishesLoading && (
                        <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center rounded-[3rem] animate-in fade-in duration-300">
                             <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin shadow-2xl mb-4"></div>
                             <p className="text-slate-900 font-black text-xs uppercase tracking-[0.3em] animate-pulse">Syncing Dishes...</p>
                        </div>
                    )}
                    
                    {dishes.map((dish, dishIdx) => (
                        <SortableItemWrapper key={dish.dishId} id={dish.dishId} disabled={!isReorderingDishes}>
                        <div
                            className={`flex flex-col lg:flex-row gap-6 md:gap-8 p-5 md:p-8 bg-white/90 backdrop-blur-md rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border transition-all duration-500 group animate-in fade-in slide-in-from-bottom-4 ${isDishDirty(dish) ? 'border-indigo-200 ring-2 ring-indigo-50 shadow-indigo-100' : 'border-white'}`}
                            style={!isReorderingDishes ? { animationDelay: `${dishIdx * 50}ms` } : {}}
                        >
                            {/* Image Section */}
                            <div className="w-full lg:w-[40%] flex flex-col gap-4">
                                <div 
                                    onDragOver={(e) => handleDishDragOver(e, dish.dishId)}
                                    onDragLeave={handleDishDragLeave}
                                    onDrop={(e) => handleDishDrop(e, dish.dishId)}
                                    className={`w-full aspect-[4/3] sm:aspect-video lg:aspect-square bg-slate-950 rounded-[2rem] overflow-hidden relative group/img shadow-2xl border-4 transition-all duration-300 ${draggingOverDishId === dish.dishId ? 'border-indigo-500 scale-[1.05] ring-4 ring-indigo-200' : 'border-white'}`}
                                >
                                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                                    
                                    {dish.previewUrl || dish.imageUrl ? (
                                        <img src={dish.previewUrl || dish.imageUrl!} alt={dish.name} className="w-full h-full object-cover z-10 relative transition-transform duration-700 group-hover/img:scale-110" />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 z-10">
                                            <FiCamera size={48} className="mb-4 opacity-20" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">No Visualized Image</span>
                                        </div>
                                    )}

                                    {dish.previewUrl && (
                                        <div className="absolute top-4 left-4 bg-indigo-600 text-white text-[8px] font-black uppercase px-2 py-1 rounded-md z-20 shadow-lg tracking-widest animate-pulse">
                                            Pending Save
                                        </div>
                                    )}

                                    {/* Drop Overlay */}
                                    {draggingOverDishId === dish.dishId && (
                                        <div className="absolute inset-0 bg-indigo-600/60 backdrop-blur-md flex flex-col items-center justify-center text-white z-40 animate-in fade-in duration-200">
                                            <FiUpload className="text-4xl mb-2" />
                                            <span className="font-black tracking-[0.2em] text-[10px] uppercase">Drop to Upload</span>
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
                                                        if (file) handleLocalImagePreview(dish.dishId, file);
                                                    }}
                                                />
                                            </label>
                                            <button
                                                onClick={() => handleDeleteDish(dish)}
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
                                        <div className="flex gap-2">
                                        <input
                                            className="flex-1 p-4 md:p-5 border border-slate-100 bg-slate-50 focus:bg-white rounded-[1rem] md:rounded-[1.5rem] font-black text-slate-900 text-xl md:text-2xl focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                                            value={dish.name}
                                            onChange={(e) => handleUpdateDish(dish.dishId, "name", e.target.value)}
                                        />
                                        </div>
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

                                    {/* Variants Section */}
                                    <div className="bg-slate-50/50 p-4 rounded-[1.5rem] border border-slate-100 space-y-4">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing Variants (Size/Prep)</span>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    const newVariants = [...(dish.variants || []), { variantType: "", label: "", price: 0 }];
                                                    handleUpdateDish(dish.dishId, "variants", newVariants);
                                                }}
                                                className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors flex items-center gap-1"
                                            >
                                                <FiPlus /> Add Variant
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            {(dish.variants || []).map((variant, vIdx) => (
                                                <div key={vIdx} className="flex gap-2 items-center animate-in slide-in-from-left-2 duration-300">
                                                    <input
                                                        placeholder="Type"
                                                        className="w-[72px] shrink-0 p-3 border border-slate-100 bg-white rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-100"
                                                        value={variant.variantType || ""}
                                                        onChange={(e) => {
                                                            const newVariants = [...dish.variants];
                                                            newVariants[vIdx].variantType = e.target.value;
                                                            handleUpdateDish(dish.dishId, "variants", newVariants);
                                                        }}
                                                    />
                                                    <input
                                                        placeholder="Label"
                                                        className="flex-1 min-w-[60px] p-3 border border-slate-100 bg-white rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-100"
                                                        value={variant.label}
                                                        onChange={(e) => {
                                                            const newVariants = [...dish.variants];
                                                            newVariants[vIdx].label = e.target.value;
                                                            handleUpdateDish(dish.dishId, "variants", newVariants);
                                                        }}
                                                    />
                                                    <div className="w-24 relative shrink-0">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">{outlet?.currency}</span>
                                                        <input
                                                            placeholder="Price"
                                                            type="number"
                                                            className="w-full text-left p-3 pl-[1.6rem] border border-slate-100 bg-white rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-100"
                                                            value={variant.price === 0 ? "" : variant.price}
                                                            onChange={(e) => {
                                                                const newVariants = [...dish.variants];
                                                                newVariants[vIdx].price = parseFloat(e.target.value) || 0;
                                                                handleUpdateDish(dish.dishId, "variants", newVariants);
                                                            }}
                                                        />
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            const newVariants = [...dish.variants];
                                                            newVariants.splice(vIdx, 1);
                                                            handleUpdateDish(dish.dishId, "variants", newVariants);
                                                        }}
                                                        className="w-8 h-8 shrink-0 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <FiX size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                            {(dish.variants || []).length === 0 && (
                                                <p className="text-[9px] text-slate-300 font-bold uppercase text-center py-2 italic">No variants (Single Price Dish)</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Add-ons Section */}
                                    {dish.addons.length > 0 || expandedAddons[dish.dishId] ? (
                                        <div className="bg-slate-50/50 p-4 rounded-[1.5rem] border border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center justify-between px-1">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custom Add-ons</span>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-2">
                                                {dish.addons.map((addon, aIdx) => (
                                                    <div key={aIdx} className="bg-white border border-slate-200 pl-3 pr-1 py-1 rounded-full flex items-center gap-2 shadow-sm animate-in zoom-in duration-300">
                                                        <span className="text-xs font-bold text-slate-700">{addon.name}</span>
                                                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{outlet?.currency}{addon.price}</span>
                                                        <button 
                                                            onClick={() => {
                                                                const newAddons = [...dish.addons];
                                                                newAddons.splice(aIdx, 1);
                                                                handleUpdateDish(dish.dishId, "addons", newAddons);
                                                            }}
                                                            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <FiX size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                                
                                                {/* Add-on Input */}
                                                <div className="flex items-center gap-1 bg-slate-100/50 rounded-full pl-3 pr-1 py-1 group/add">
                                                    <input 
                                                        id={`addon-name-${dish.dishId}`}
                                                        placeholder="Name (e.g. Cheese)"
                                                        className="bg-transparent border-none outline-none text-xs font-bold text-slate-600 w-28 focus:w-32 transition-all placeholder:text-slate-300"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                document.getElementById(`addon-price-${dish.dishId}`)?.focus();
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-slate-300 font-bold border-l border-slate-200 pl-1">{outlet?.currency || '₹'}</span>
                                                    <input 
                                                        id={`addon-price-${dish.dishId}`}
                                                        placeholder="Price"
                                                        type="number"
                                                        className="bg-transparent border-none outline-none text-xs font-bold text-slate-600 w-16 focus:w-20 transition-all placeholder:text-slate-300"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                const nameInput = document.getElementById(`addon-name-${dish.dishId}`) as HTMLInputElement;
                                                                const priceInput = e.currentTarget;
                                                                const name = nameInput.value.trim();
                                                                const price = parseFloat(priceInput.value) || 0;
                                                                
                                                                if (name) {
                                                                    handleUpdateDish(dish.dishId, "addons", [...dish.addons, { name, price }]);
                                                                    nameInput.value = "";
                                                                    priceInput.value = "";
                                                                    nameInput.focus();
                                                                    toast.success(`Add-on "${name}" added!`, { icon: '➕', duration: 1500 });
                                                                } else {
                                                                    toast.error("Please enter an add-on name");
                                                                    nameInput.focus();
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <button 
                                                        onClick={() => {
                                                            const nameInput = document.getElementById(`addon-name-${dish.dishId}`) as HTMLInputElement;
                                                            const priceInput = document.getElementById(`addon-price-${dish.dishId}`) as HTMLInputElement;
                                                            if (!nameInput || !priceInput) return;
                                                            
                                                            const name = nameInput.value.trim();
                                                            const price = parseFloat(priceInput.value) || 0;
                                                            
                                                            if (name) {
                                                                handleUpdateDish(dish.dishId, "addons", [...dish.addons, { name, price }]);
                                                                nameInput.value = "";
                                                                priceInput.value = "";
                                                                nameInput.focus();
                                                                toast.success(`Add-on "${name}" added!`, { icon: '➕', duration: 1500 });
                                                            } else {
                                                                toast.error("Please enter an add-on name");
                                                                nameInput.focus();
                                                            }
                                                        }}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-1 rounded-full opacity-40 group-hover/add:opacity-100 transition-opacity active:scale-95 flex-shrink-0"
                                                    >
                                                        <FiPlus size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-[8px] font-bold text-slate-400 italic px-1">Tip: Add a name and price then press Enter or click +</p>
                                        </div>
                                    ) : (
                                        <div className="flex justify-end pt-0 animate-in fade-in duration-300">
                                            <button 
                                                onClick={() => setExpandedAddons(prev => ({ ...prev, [dish.dishId]: true }))}
                                                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 text-[10px] font-black uppercase tracking-widest transition-all border border-slate-100"
                                            >
                                                <FiPlus size={12} /> Add-on
                                            </button>
                                        </div>
                                    )}

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

                                <div className="flex items-center justify-end gap-3 md:gap-4 pt-2 md:pt-4">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDeleteDish(dish);
                                        }}
                                        className="h-10 md:h-14 px-4 md:px-6 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer z-10"
                                        title="Delete Dish"
                                    >
                                        <FiTrash2 className="text-lg md:text-xl" />
                                        <span className="text-xs md:text-sm font-black uppercase tracking-widest hidden sm:block">Delete</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => saveDish(e, dish)}
                                        disabled={!isDishDirty(dish) || isSaving}
                                        className={`flex-1 sm:flex-none h-10 md:h-14 px-8 md:px-10 rounded-xl md:rounded-2xl font-black text-sm md:text-lg transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl relative z-20 ${isDishDirty(dish)
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100 cursor-pointer'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                        data-dish-id={dish.dishId}
                                    >
                                        {isSaving ? <FiRefreshCw className="animate-spin" /> : <FiSave />}
                                        <span>{isDishDirty(dish) ? "Save" : "Saved"}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        </SortableItemWrapper>
                    ))}

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
                    </SortableContext>
                </DndContext>

                {/* Pagination for Dishes */}
                {totalDishes > dishLimit && (
                    <div className="flex items-center justify-center gap-4 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-50">
                        <button 
                            type="button"
                            disabled={dishPage === 1 || dishesLoading}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("PREV CLICKED, current page:", dishPage);
                                setDishPage(prev => Math.max(1, prev - 1));
                            }}
                            className="p-4 bg-white rounded-2xl shadow-lg border border-slate-100 disabled:opacity-30 active:scale-90 transition-all font-black hover:bg-slate-50 cursor-pointer pointer-events-auto"
                        >
                            <FiArrowLeft />
                        </button>
                        <div className="px-6 py-3 bg-white rounded-xl shadow-sm border border-slate-50 flex flex-col items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Page</span>
                            <span className="font-black text-slate-900 text-sm leading-none tabular-nums">{dishPage} <span className="text-slate-300">/</span> {Math.ceil(totalDishes/dishLimit)}</span>
                        </div>
                        <button 
                            type="button"
                            disabled={dishPage >= Math.ceil(totalDishes/dishLimit) || dishesLoading}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("NEXT CLICKED, current page:", dishPage);
                                setDishPage(prev => prev + 1);
                            }}
                            className="p-4 bg-white rounded-2xl shadow-lg border border-slate-100 disabled:opacity-30 active:scale-90 transition-all font-black hover:bg-slate-50 cursor-pointer pointer-events-auto"
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

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
                <Breadcrumb 
                    items={
                        viewMode === 'dishes' 
                        ? [
                            { label: 'Settings', path: '/configure-outlets' },
                            { label: 'Your Outlets', path: '/view-outlets' },
                            { label: outlet?.storeName || 'Menu', path: `/manage-menu/${outletUid}` },
                            { label: categories.find(c => c.categoryId === selectedCategoryId)?.categoryName || 'Dishes' }
                        ]
                        : [
                            { label: 'Settings', path: '/configure-outlets' },
                            { label: 'Your Outlets', path: '/view-outlets' },
                            { label: outlet?.storeName || 'Menu' }
                        ]
                    } 
                />
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

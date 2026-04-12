import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import toast from "react-hot-toast";
import { 
    KeyboardSensor, 
    PointerSensor, 
    useSensor, 
    useSensors 
} from '@dnd-kit/core';
import { 
    sortableKeyboardCoordinates, 
    arrayMove 
} from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { FiHome } from "react-icons/fi";

// Feature Components
import type { Dish, Category, OutletData } from "../features/menu/types";
import Breadcrumb from "../components/Breadcrumb";
import HomeView from "../features/menu/components/HomeView";
import CategoriesView from "../features/menu/components/CategoriesView";
import DishesView from "../features/menu/components/DishesView";
import CategoryEditModal from "../features/menu/components/CategoryEditModal";
import DishEditModal from "../features/menu/components/DishEditModal";
import CategorySelectorModal from "../features/menu/components/CategorySelectorModal";
import DeleteConfirmModal from "../features/menu/components/DeleteConfirmModal";

export default function ManageMenu() {
    const { outletUid, categoryId: urlCategoryId } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Core Data State
    const [outlet, setOutlet] = useState<OutletData | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Category State
    const [categories, setCategories] = useState<Category[]>([]);
    const [catPage, setCatPage] = useState(Number(searchParams.get('cp')) || 1);
    const [totalCats, setTotalCats] = useState(0);
    const [catLimit] = useState(6);
    
    // Dish State
    const [dishes, setDishes] = useState<Dish[]>([]);
    const [dishPage, setDishPage] = useState(Number(searchParams.get('dp')) || 1);
    const [totalDishes, setTotalDishes] = useState(0);
    const [dishLimit] = useState(6);
    const [originalDishes, setOriginalDishes] = useState<Dish[]>([]);
    const [dishesLoading, setDishesLoading] = useState(false);
    
    // View State
    const [viewMode, setViewMode] = useState<'home' | 'categories' | 'dishes'>(() => {
        if (urlCategoryId) return 'dishes';
        if (window.location.pathname.endsWith('/categories')) return 'categories';
        return 'home';
    });
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(urlCategoryId || null);
    const [viewModeUI, setViewModeUI] = useState<'grid' | 'list'>(() => {
        return (localStorage.getItem('menu_view_pref') as 'grid' | 'list') || 'grid';
    });

    useEffect(() => {
        localStorage.setItem('menu_view_pref', viewModeUI);
    }, [viewModeUI]);

    // Home – dishes card picker state
    const [showCatPicker, setShowCatPicker] = useState(false);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [catPickerLoading, setCatPickerLoading] = useState(false);

    // Update URL when page changes
    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        if (catPage > 1) params.set('cp', String(catPage));
        else params.delete('cp');
        
        if (dishPage > 1) params.set('dp', String(dishPage));
        else params.delete('dp');

        // Only update if changes to avoid infinite loop
        if (params.toString() !== searchParams.toString()) {
            setSearchParams(params, { replace: true });
        }
    }, [catPage, dishPage, setSearchParams, searchParams]);

    // Modal & Action State
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newCategoryPublished, setNewCategoryPublished] = useState(true);

    const [editingDishId, setEditingDishId] = useState<string | null>(null);
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Search state
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

    // Handlers
    const handleCatSearch = useCallback((val: string) => {
        setCatSearch(val);
        setCatPage(1);
        const params = new URLSearchParams(searchParams);
        params.delete('cp');
        setSearchParams(params);
    }, [searchParams, setSearchParams]);

    const handleDishSearch = useCallback((val: string) => {
        setDishSearch(val);
        setDishPage(1);
        const params = new URLSearchParams(searchParams);
        params.delete('dp');
        setSearchParams(params);
    }, [searchParams, setSearchParams]);

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
            fetchCategories();
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
        try {
            const res = await api.get(`/outlets/${outletUid}/dishes`, {
                params: { categoryId: selectedCategoryId, search: dishSearch, page: dishPage, limit: dishLimit }
            });
            setDishes(res.data.dishes.map((d: any) => ({ ...d, addons: d.addons || [] })));
            setOriginalDishes(JSON.parse(JSON.stringify(res.data.dishes.map((d: any) => ({ ...d, addons: d.addons || [] })))));
            setTotalDishes(res.data.total);
        } catch (error) {
            toast.error("Failed to load dishes");
        } finally {
            setDishesLoading(false);
        }
    }, [selectedCategoryId, outletUid, dishPage, dishLimit, dishSearch]);

    useEffect(() => {
        if (outletUid) fetchOutletInfo();
    }, [outletUid, fetchOutletInfo]);

    useEffect(() => {
        if (viewMode === 'categories') {
            fetchCategories();
        } else if (viewMode === 'home' && outletUid) {
            api.get(`/outlets/${outletUid}/categories`, { params: { page: 1, limit: 1 } })
                .then(res => setTotalCats(res.data.total))
                .catch(() => {});
        }
    }, [viewMode, fetchCategories, outletUid]);

    useEffect(() => {
        if (viewMode === 'dishes' && selectedCategoryId) fetchDishes();
    }, [viewMode, selectedCategoryId, fetchDishes]);

    useEffect(() => {
        // Sync page numbers from URL
        const urlCp = Number(searchParams.get('cp')) || 1;
        const urlDp = Number(searchParams.get('dp')) || 1;
        
        setCatPage(prev => prev !== urlCp ? urlCp : prev);
        setDishPage(prev => prev !== urlDp ? urlDp : prev);

        if (urlCategoryId) {
            if (selectedCategoryId !== urlCategoryId) {
                setSelectedCategoryId(urlCategoryId);
                setViewMode('dishes');
            }
        } else if (window.location.pathname.endsWith('/categories')) {
            if (viewMode !== 'categories') {
                setSelectedCategoryId(null);
                setViewMode('categories');
            }
        } else if (viewMode !== 'home') {
            setSelectedCategoryId(null);
            setViewMode('home');
        }
    }, [urlCategoryId, window.location.pathname, searchParams]); // Removed state dependencies to prevent loop

    const fetchAllCategoriesForPicker = useCallback(async () => {
        if (allCategories.length > 0) return;
        setCatPickerLoading(true);
        try {
            const res = await api.get(`/outlets/${outletUid}/categories`, { params: { page: 1, limit: -1 } });
            setAllCategories(res.data.categories.map((c: any) => ({
                categoryId: c.categoryId,
                categoryName: c.name || c.categoryName,
                isPublished: c.isPublished !== false,
                dishCount: c.dishCount || 0
            })));
        } catch {
            toast.error("Failed to load categories");
        } finally {
            setCatPickerLoading(false);
        }
    }, [outletUid, allCategories.length]);

    const handleUpdateDish = (dishId: string, field: keyof Dish, value: any) => {
        setDishes(prev => prev.map(d => d.dishId === dishId ? { ...d, [field]: value } : d));
    };

    const isDishDirty = (currentDish: Dish) => {
        const origDish = originalDishes.find(d => d.dishId === currentDish.dishId);
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
        setIsSaving(true);
        try {
            let finalImageUrl = dish.imageUrl;
            if (dish.pendingImageFile) {
                const formData = new FormData();
                formData.append('file', dish.pendingImageFile);
                const uploadRes = await api.post(`/dishes/${dish.dishId}/upload-image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                finalImageUrl = uploadRes.data.imageUrl;
            }
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
            const updatedDish = { ...res.data, pendingImageFile: undefined, previewUrl: undefined };
            setOriginalDishes(prev => prev.map(d => d.dishId === dish.dishId ? updatedDish : d));
            setDishes(prev => prev.map(d => d.dishId === dish.dishId ? updatedDish : d));
            toast.success("Saved!");
        } catch (e: any) {
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
            await api.post(`/outlets/${outletUid}/categories`, null, { params: { name: newCategoryName, isPublished: newCategoryPublished } });
            catPage === 1 ? fetchCategories() : setCatPage(1);
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
            await api.put(`/categories/${editingCategory.categoryId}`, null, { params: { name: newCategoryName, isPublished: newCategoryPublished } });
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

    const confirmDelete = async () => {
        if (!deleteConfirmData) return;
        setIsDeleting(true);
        try {
            if (deleteConfirmData.type === 'category') {
                await api.delete(`/categories/${deleteConfirmData.id}`);
                setCategories(prev => prev.filter(cat => cat.categoryId !== deleteConfirmData.id));
                setTotalCats(prev => prev - 1);
                toast.success(`${deleteConfirmData.name} deleted!`);
            } else {
                await api.delete(`/dishes/${deleteConfirmData.id}`);
                setDishes(prev => prev.filter(d => d.dishId !== deleteConfirmData.id));
                setOriginalDishes(prev => prev.filter(d => d.dishId !== deleteConfirmData.id));
                setTotalDishes(prev => prev - 1);
                toast.success(`${deleteConfirmData.name} removed!`);
            }
            setIsDeleteModalOpen(false);
        } catch (e) {
            toast.error(`Failed to delete`);
        } finally {
            setIsDeleting(false);
            setDeleteConfirmData(null);
        }
    };

    const handleAddManualDish = async (catId: string) => {
        try {
            await api.post(`/outlets/${outletUid}/dishes`, {
                categoryId: catId,
                name: "New Dish",
                price: 0,
                description: "",
                isVariant: false,
                parentId: null
            });
            fetchDishes();
            toast.success("Dish added!");
        } catch (e) {
            toast.error("Failed to add dish");
        }
    };

    const handleGenerateImage = async (dishId: string) => {
        const dish = dishes.find(d => d.dishId === dishId);
        if (!dish || !dish.requestId) return toast.error("Missing context");
        setRegeneratingId(dishId);
        try {
            const res = await api.post(`/requests/${dish.requestId}/generate-image/${dishId}`);
            setDishes(prev => prev.map(d => d.dishId === dishId ? { ...d, imageUrl: res.data.imageUrl, generationCount: (d.generationCount || 0) + 1 } : d));
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

    const handleDishDragOver = (e: React.DragEvent, dishId: string) => { e.preventDefault(); setDraggingOverDishId(dishId); };
    const handleDishDragLeave = () => setDraggingOverDishId(null);
    const handleDishDrop = (e: React.DragEvent, dishId: string) => {
        e.preventDefault();
        setDraggingOverDishId(null);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) handleLocalImagePreview(dishId, file);
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin shadow-2xl mb-6"></div>
            <p className="text-slate-900 font-black text-xs uppercase tracking-[0.3em] animate-pulse">Loading Menu...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                {/* Shared Breadcrumb Component */}
                <Breadcrumb 
                    items={[
                        { label: "Settings", path: "/settings" },
                        { label: "Your Outlets", onClick: () => window.history.back() },
                        { 
                            label: "Menu", 
                            onClick: viewMode !== 'home' ? () => setViewMode('home') : undefined 
                        },
                        ...(viewMode !== 'home' ? [{
                            label: "Categories",
                            onClick: viewMode !== 'categories' ? () => navigate(`/manage-menu/${outletUid}/categories`) : undefined
                        }] : []),
                        ...(viewMode === 'dishes' && selectedCategoryId ? (() => {
                            const cat = categories.find(c => c.categoryId === selectedCategoryId);
                            return cat ? [{ label: cat.categoryName }] : [];
                        })() : [])
                    ]}
                />

                {viewMode === 'home' && (
                    <HomeView 
                        outlet={outlet}
                        totalCats={totalCats}
                        onViewCategories={() => navigate(`/manage-menu/${outletUid}/categories`)}
                        onViewDishes={() => {
                            setShowCatPicker(true);
                            fetchAllCategoriesForPicker();
                        }}
                        outletUid={outletUid!}
                    />
                )}

                {viewMode === 'categories' && (
                    <CategoriesView 
                        categories={categories}
                        catSearch={catSearch}
                        onSearch={handleCatSearch}
                        isReordering={isReorderingCats}
                        onToggleReorder={toggleReorderCats}
                        onAddCategory={handleAddCategory}
                        onEditCategory={(cat: Category) => {
                            setEditingCategory(cat);
                            setNewCategoryName(cat.categoryName);
                            setNewCategoryPublished(cat.isPublished !== false);
                            setIsCategoryModalOpen(true);
                        }}
                        onDeleteCategory={(cat: Category) => {
                            setDeleteConfirmData({ type: 'category', id: cat.categoryId, name: cat.categoryName });
                            setIsDeleteModalOpen(true);
                        }}
                        isSaving={isSaving}
                        sensors={sensors}
                        handleDragEnd={handleDragEndCategories}
                        outletUid={outletUid!}
                        totalCats={totalCats}
                        catLimit={catLimit}
                        catPage={catPage}
                        setCatPage={setCatPage}
                        viewMode={viewModeUI}
                        setViewMode={setViewModeUI}
                    />
                )}

                {viewMode === 'dishes' && (
                    <DishesView 
                        categories={categories}
                        selectedCategoryId={selectedCategoryId}
                        dishSearch={dishSearch}
                        onSearch={handleDishSearch}
                        isReordering={isReorderingDishes}
                        onToggleReorder={toggleReorderDishes}
                        onAddDish={handleAddManualDish}
                        onEditDish={setEditingDishId}
                        onChangeCategory={() => {
                            setShowCatPicker(true);
                            fetchAllCategoriesForPicker();
                        }}
                        dishes={dishes}
                        dishesLoading={dishesLoading}
                        isSaving={isSaving}
                        sensors={sensors}
                        handleDragEnd={handleDragEndDishes}
                        isDishDirty={isDishDirty}
                        totalDishes={totalDishes}
                        dishLimit={dishLimit}
                        dishPage={dishPage}
                        setDishPage={setDishPage}
                        viewMode={viewModeUI}
                        setViewMode={setViewModeUI}
                    />
                )}

                <CategoryEditModal 
                    isOpen={isCategoryModalOpen}
                    isSaving={isSaving}
                    editingCategory={editingCategory}
                    categoryName={newCategoryName}
                    setCategoryName={setNewCategoryName}
                    isPublished={newCategoryPublished}
                    setIsPublished={setNewCategoryPublished}
                    onClose={() => setIsCategoryModalOpen(false)}
                    onSave={editingCategory ? handleUpdateCategory : handleAddCategory}
                />

                <DishEditModal 
                    isOpen={!!editingDishId}
                    editingDishId={editingDishId}
                    dishes={dishes}
                    outlet={outlet}
                    isDishDirty={isDishDirty}
                    onClose={() => setEditingDishId(null)}
                    onUpdateDish={handleUpdateDish}
                    handleDishDragOver={handleDishDragOver}
                    handleDishDragLeave={handleDishDragLeave}
                    handleDishDrop={handleDishDrop}
                    draggingOverDishId={draggingOverDishId}
                    handleGenerateImage={handleGenerateImage}
                    regeneratingId={regeneratingId}
                    handleLocalImagePreview={handleLocalImagePreview}
                    expandedAddons={expandedAddons}
                    setExpandedAddons={setExpandedAddons}
                    handleDeleteDish={handleDeleteDish}
                    saveDish={saveDish}
                    isSaving={isSaving}
                />

                <CategorySelectorModal 
                    isOpen={showCatPicker}
                    onClose={() => setShowCatPicker(false)}
                    categories={allCategories}
                    loading={catPickerLoading}
                    selectedCategoryId={selectedCategoryId}
                    onSelect={(catId) => {
                        navigate(`/manage-menu/${outletUid}/category/${catId}`);
                        window.scrollTo(0, 0);
                    }}
                />

                <DeleteConfirmModal 
                    isOpen={isDeleteModalOpen}
                    isDeleting={isDeleting}
                    data={deleteConfirmData}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={confirmDelete}
                />
            </div>
        </div>
    );
}

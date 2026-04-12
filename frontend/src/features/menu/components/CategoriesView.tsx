import { FiPlus, FiRefreshCw } from "react-icons/fi";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import type { Category } from "../types";
import SearchInput from "./SearchInput";
import SortableItemWrapper from "./SortableItemWrapper";
import CategoryCard from "./CategoryCard";
import Pagination from "./Pagination";
import ViewToggle from "./ViewToggle";

interface CategoriesViewProps {
    categories: Category[];
    catSearch: string;
    onSearch: (val: string) => void;
    isReordering: boolean;
    onToggleReorder: () => void;
    onAddCategory: () => void;
    onEditCategory: (cat: Category) => void;
    onDeleteCategory: (cat: Category) => void;
    isSaving: boolean;
    sensors: any;
    handleDragEnd: (event: any) => void;
    outletUid: string;
    totalCats: number;
    catLimit: number;
    catPage: number;
    setCatPage: React.Dispatch<React.SetStateAction<number>>;
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
}

export default function CategoriesView({
    categories,
    catSearch,
    onSearch,
    isReordering,
    onToggleReorder,
    onAddCategory,
    onEditCategory,
    onDeleteCategory,
    isSaving,
    sensors,
    handleDragEnd,
    outletUid,
    totalCats,
    catLimit,
    catPage,
    setCatPage,
    viewMode,
    setViewMode
}: CategoriesViewProps) {
    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">

                    <div>
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">Menu Categories</h2>
                        <p className="text-slate-500 font-medium text-sm md:text-base">Manage how your dishes are grouped.</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="relative w-full sm:w-80">
                             <SearchInput 
                                placeholder="Find a category..."
                                initialValue={catSearch}
                                onSearch={onSearch}
                             />
                        </div>
                        <div className="flex gap-4 w-full sm:w-auto">
                            <button
                                onClick={onToggleReorder}
                                disabled={isSaving}
                                className={`px-8 py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all flex border border-slate-200 items-center justify-center gap-3 cursor-pointer ${isReordering ? 'bg-amber-500 hover:bg-amber-600 text-white border-none' : 'bg-white hover:bg-slate-50 text-slate-900'}`}
                            >
                                {isReordering ? (isSaving ? <FiRefreshCw className="animate-spin" /> : "Save Order") : "Reorder"}
                            </button>
                            {!isReordering && (
                                <button
                                    onClick={onAddCategory}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 md:gap-3 cursor-pointer"
                                >
                                    <FiPlus size={20} /> Add Category
                                </button>
                            )}
                        </div>
                    </div>
                    <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
                </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={categories.map(c => c.categoryId)} strategy={rectSortingStrategy}>
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 relative min-h-[200px]" : "flex flex-col gap-3 relative min-h-[200px]"}>
                        {categories.map((category, idx) => (
                            <SortableItemWrapper key={category.categoryId} id={category.categoryId} disabled={!isReordering}>
                                <CategoryCard 
                                    category={category}
                                    idx={idx}
                                    isReordering={isReordering}
                                    onEdit={onEditCategory}
                                    onDelete={onDeleteCategory}
                                    outletUid={outletUid}
                                    view={viewMode}
                                />
                            </SortableItemWrapper>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Pagination for Categories */}
            <Pagination 
                currentPage={catPage}
                totalItems={totalCats}
                itemsPerPage={catLimit}
                onPageChange={setCatPage}
                isLoading={isSaving}
            />
        </div>
    );
}

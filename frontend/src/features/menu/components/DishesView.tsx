import { FiArrowLeft, FiPlus } from "react-icons/fi";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import type { Category, Dish } from "../types";
import SearchInput from "./SearchInput";
import SortableItemWrapper from "./SortableItemWrapper";
import DishCard from "./DishCard";
import Pagination from "./Pagination";
import { FiChevronDown } from "react-icons/fi";
import ViewToggle from "./ViewToggle";

interface DishesViewProps {
    categories: Category[];
    selectedCategoryId: string | null;
    dishSearch: string;
    onSearch: (val: string) => void;
    isReordering: boolean;
    onToggleReorder: () => void;
    onAddDish: (catId: string) => void;
    onEditDish: (id: string) => void;
    dishes: Dish[];
    dishesLoading: boolean;
    isSaving: boolean;
    sensors: any;
    handleDragEnd: (event: any) => void;
    isDishDirty: (dish: Dish) => boolean;
    totalDishes: number;
    dishLimit: number;
    dishPage: number;
    setDishPage: React.Dispatch<React.SetStateAction<number>>;
    onChangeCategory: () => void;
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
}

export default function DishesView({
    categories,
    selectedCategoryId,
    dishSearch,
    onSearch,
    isReordering,
    onToggleReorder,
    onAddDish,
    onEditDish,
    dishes,
    dishesLoading,
    isSaving,
    sensors,
    handleDragEnd,
    isDishDirty,
    totalDishes,
    dishLimit,
    dishPage,
    setDishPage,
    onChangeCategory,
    viewMode,
    setViewMode
}: DishesViewProps) {
    const selectedCategory = categories.find(c => c.categoryId === selectedCategoryId);

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => window.history.back()} 
                        className="hidden group items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors font-black text-xs uppercase tracking-widest cursor-pointer"
                    >
                        <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                        Back to Categories
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">
                                {selectedCategory?.categoryName || "Category Dishes"}
                            </h2>
                            <button 
                                onClick={onChangeCategory}
                                className="mt-1 p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer group/switch"
                                title="Change Category"
                            >
                                <FiChevronDown className="group-hover/switch:rotate-180 transition-transform duration-300" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                                {totalDishes} {totalDishes === 1 ? 'Dish' : 'Dishes'} Available
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-3">
                        <SearchInput initialValue={dishSearch} onSearch={onSearch} placeholder="Search dishes..." />
                        <button 
                            disabled={isSaving}
                            onClick={onToggleReorder}
                            className={`px-8 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-sm border cursor-pointer ${isReordering ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-100 hover:border-slate-200'}`}
                        >
                            {isReordering ? 'Save Order' : 'Reorder'}
                        </button>
                        <button 
                            onClick={() => selectedCategoryId && onAddDish(selectedCategoryId)}
                            className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <FiPlus size={20} /> Add Dish
                        </button>
                    </div>
                    <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
                </div>
            </div>

            {dishesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-slate-100 rounded-[2.5rem] animate-pulse" />
                    ))}
                </div>
            ) : dishes.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-20 border-2 border-dashed border-slate-100 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiPlus size={32} className="text-slate-200" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">No dishes found</h3>
                    <p className="text-slate-400 font-medium">Try searching for something else or add a new dish.</p>
                </div>
            ) : (
                <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8" : "flex flex-col gap-4"}>
                    {isReordering ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={dishes.map(d => d.dishId)} strategy={rectSortingStrategy}>
                                {dishes.map((dish, dishIdx) => (
                                    <SortableItemWrapper key={dish.dishId} id={dish.dishId}>
                                        <DishCard 
                                            dish={dish} 
                                            dishIdx={dishIdx} 
                                            isReordering={isReordering}
                                            onEdit={onEditDish}
                                            isDirty={isDishDirty}
                                            view={viewMode}
                                        />
                                    </SortableItemWrapper>
                                ))}
                            </SortableContext>
                        </DndContext>
                    ) : (
                        dishes.map((dish, dishIdx) => (
                            <SortableItemWrapper key={dish.dishId} id={dish.dishId} disabled={true}>
                                <DishCard 
                                    dish={dish} 
                                    dishIdx={dishIdx} 
                                    isReordering={isReordering}
                                    onEdit={onEditDish}
                                    isDirty={isDishDirty}
                                    view={viewMode}
                                />
                            </SortableItemWrapper>
                        ))
                    )}
                </div>
            )}

            {/* Pagination for Dishes */}
            <Pagination 
                currentPage={dishPage}
                totalItems={totalDishes}
                itemsPerPage={dishLimit}
                onPageChange={setDishPage}
                isLoading={dishesLoading}
            />
        </div>
    );
}

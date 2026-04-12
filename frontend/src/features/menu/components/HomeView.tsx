import { FiArrowRight } from "react-icons/fi";
import type { OutletData } from "../types";

interface HomeViewProps {
    outlet: OutletData | null;
    totalCats: number;
    onViewCategories: () => void;
    onViewDishes: () => void;
    outletUid: string;
}

export default function HomeView({ 
    outlet, 
    totalCats, 
    onViewCategories, 
    onViewDishes
}: HomeViewProps) {

    return (
        <div className="animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="mb-10">
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">Menu Management</h1>
                <p className="text-slate-500 font-medium text-sm md:text-base mt-1">Choose what you'd like to manage for <span className="font-black text-slate-800">{outlet?.storeName}</span></p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {/* Categories Card */}
                <div className="group bg-white/90 backdrop-blur-md rounded-[2rem] md:rounded-[2.5rem] p-8 shadow-xl border border-white hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 flex flex-col">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-200 mb-6 group-hover:scale-110 transition-transform duration-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Categories</h2>
                        <p className="text-slate-500 font-medium text-sm mt-2 leading-relaxed">
                            Organize your menu by grouping dishes into categories like Starters, Mains, Desserts.
                        </p>
                        <div className="mt-4 flex items-center gap-2">
                            <span className="bg-indigo-50 text-indigo-700 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                                {totalCats} {totalCats === 1 ? 'Category' : 'Categories'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onViewCategories}
                        className="mt-8 w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-base shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
                    >
                        Manage Categories <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Dishes Card */}
                <div className="group bg-white/90 backdrop-blur-md rounded-[2rem] md:rounded-[2.5rem] p-8 shadow-xl border border-white hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 flex flex-col relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-200 mb-6 group-hover:scale-110 transition-transform duration-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Dishes</h2>
                        <p className="text-slate-500 font-medium text-sm mt-2 leading-relaxed">
                            Add, edit, and manage individual dishes — set prices, images, variants and add-ons.
                        </p>
                        <div className="mt-4 flex items-center gap-2">
                            <span className="bg-amber-50 text-amber-700 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                                Select a category to browse
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onViewDishes}
                        className="mt-8 w-full py-4 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white rounded-2xl font-black text-base shadow-xl shadow-orange-100 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
                    >
                        View Dishes <FiArrowRight />
                    </button>
                </div>
            </div>
        </div>
    );
}

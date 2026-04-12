import { FiArrowLeft, FiArrowRight } from "react-icons/fi";

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    isLoading?: boolean;
}

export default function Pagination({
    currentPage,
    totalItems,
    itemsPerPage,
    onPageChange,
    isLoading = false
}: PaginationProps) {
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    if (totalItems <= itemsPerPage && currentPage === 1) return null;

    return (
        <div className="flex items-center justify-center mt-12 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white rounded-full shadow-xl shadow-slate-200/50 border border-slate-100 p-2 flex items-center gap-6 md:gap-12 px-6 md:px-8">
                {/* Page Info */}
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-[0.2em]">Page</span>
                    <div className="flex items-center gap-1.5 font-black text-sm md:text-base">
                        <span className="text-indigo-600">{currentPage}</span>
                        <span className="text-slate-200 font-medium">of</span>
                        <span className="text-slate-900">{totalPages}</span>
                    </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        disabled={currentPage === 1 || isLoading}
                        onClick={() => onPageChange(currentPage - 1)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:text-slate-600 transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                    >
                        <FiArrowLeft className="text-sm" />
                        <span className="hidden sm:inline">Prev</span>
                    </button>
                    <button
                        disabled={currentPage >= totalPages || isLoading}
                        onClick={() => onPageChange(currentPage + 1)}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                    >
                        <span className="hidden sm:inline">Next</span>
                        <FiArrowRight className="text-sm" />
                    </button>
                </div>
            </div>
        </div>
    );
}

import { FiGrid, FiList } from "react-icons/fi";

interface ViewToggleProps {
    viewMode: 'grid' | 'list';
    onViewChange: (mode: 'grid' | 'list') => void;
}

export default function ViewToggle({ viewMode, onViewChange }: ViewToggleProps) {
    return (
        <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100 w-fit self-end mt-2">
            <button
                onClick={() => onViewChange('grid')}
                className={`p-2.5 rounded-xl transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest cursor-pointer ${
                    viewMode === 'grid' 
                    ? 'bg-white text-indigo-600 shadow-md translate-y-0' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
            >
                <FiGrid size={16} />
                <span className={viewMode === 'grid' ? 'block' : 'hidden md:block'}>Grid</span>
            </button>
            <button
                onClick={() => onViewChange('list')}
                className={`p-2.5 rounded-xl transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest cursor-pointer ${
                    viewMode === 'list' 
                    ? 'bg-white text-indigo-600 shadow-md translate-y-0' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
            >
                <FiList size={16} />
                <span className={viewMode === 'list' ? 'block' : 'hidden md:block'}>List</span>
            </button>
        </div>
    );
}

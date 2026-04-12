import { FiTrash2, FiRefreshCw } from "react-icons/fi";

interface DeleteConfirmModalProps {
    isOpen: boolean;
    isDeleting: boolean;
    data: {
        type: 'category' | 'dish';
        name: string;
    } | null;
    onClose: () => void;
    onConfirm: () => void;
}

export default function DeleteConfirmModal({ isOpen, isDeleting, data, onClose, onConfirm }: DeleteConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isDeleting && onClose()}></div>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-br from-red-500 to-red-600 p-8 text-white text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                        <FiTrash2 size={40} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-black tracking-tight">Delete {data?.type === 'category' ? 'Category' : 'Dish'}?</h3>
                </div>
                <div className="p-8 text-center pt-10">
                    <p className="text-slate-600 font-medium mb-2">Are you sure you want to delete <span className="font-black text-slate-900 underline block mt-1">"{data?.name}"</span></p>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest bg-red-50 py-2 rounded-lg">Action cannot be undone</p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-10">
                        <button
                            disabled={isDeleting}
                            onClick={onClose}
                            className="py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl font-black transition-all active:scale-95 border border-slate-100 disabled:opacity-50 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={isDeleting}
                            onClick={onConfirm}
                            className="py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-100 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            {isDeleting ? <FiRefreshCw className="animate-spin" /> : "Delete"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

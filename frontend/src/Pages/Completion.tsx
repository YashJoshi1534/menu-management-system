import React from "react";
import { FiCheckCircle, FiExternalLink } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function Completion() {
    const navigate = useNavigate();

    const handleVisitWebsite = (e: React.MouseEvent) => {
        e.preventDefault();
        const uid = localStorage.getItem("storeUid") || "unknown";
        const name = "menu"; // ideally fetch or store this too, but 'menu' works as slug for now or we can fetch it. 
        // Actually, let's use a safe fallback or just storeUid if name isn't crucial for logic but nice for URL.

        // For better UX, let's try to get Name if possible, otherwise 'store'.
        // Assuming we might not have storeName in LS.

        const url = `/${uid}/${name}`;

        toast.success("Opening your AI-generated website! 🚀");
        // Open in new tab
        window.open(url, "_blank");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-green-400/20 blur-3xl"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-400/20 blur-3xl"></div>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-12 rounded-3xl shadow-2xl text-center max-w-lg w-full relative z-10 border border-white animate-in fade-in zoom-in-95 duration-500">
                <div className="flex justify-center mb-8 relative">
                    <div className="absolute inset-0 bg-green-500 blur-xl opacity-20 rounded-full scale-150 animate-pulse"></div>
                    <FiCheckCircle className="text-8xl text-green-500 relative z-10 drop-shadow-md" />
                </div>
                <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">You're All Set! 🎉</h1>
                <p className="text-gray-500 text-lg mb-10 leading-relaxed font-medium">
                    Your restaurant menu has been processed and your AI website is ready to impress.
                </p>

                <div className="flex flex-col gap-5">
                    <button
                        onClick={handleVisitWebsite}
                        className="bg-green-600 text-white py-4 px-8 rounded-2xl font-bold text-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-3 border border-green-500/30 group"
                    >
                        Visit Your Website 
                        <FiExternalLink className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="text-gray-500 hover:text-gray-900 font-bold bg-gray-50 hover:bg-gray-100 py-4 px-8 rounded-2xl transition-all active:scale-95"
                    >
                        Go to Admin Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}

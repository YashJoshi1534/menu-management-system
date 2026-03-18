import React from "react";
import { FiCheckCircle, FiExternalLink, FiLayout } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import ProgressBar from "../components/ProgressBar";

export default function Completion() {
    const navigate = useNavigate();

    const handleVisitWebsite = (e: React.MouseEvent) => {
        e.preventDefault();
        const uid = localStorage.getItem("storeUid") || "unknown";
        const name = "menu"; 
        const url = `/${uid}/${name}`;

        toast.success("Opening your AI-generated website! 🚀");
        window.open(url, "_blank");
    };

    return (
        <div className="h-[calc(100vh-76px)] bg-white flex flex-col items-center p-4 md:p-6 relative overflow-hidden animate-in fade-in duration-700">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none fixed z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[120px]"></div>
            </div>

            <div className="w-full z-10 flex flex-col gap-6 items-center text-center h-full">
                <ProgressBar currentStep={4} />
                
                <div className="flex flex-col items-center justify-center space-y-8 py-4 w-full mx-auto flex-1">
                    {/* Hero Icon */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-green-500 blur-2xl opacity-10 rounded-full scale-125 animate-pulse"></div>
                        <div className="w-24 h-24 bg-green-50 rounded-[2rem] flex items-center justify-center border-2 border-white shadow-xl relative z-10">
                            <FiCheckCircle className="text-5xl text-green-500" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-[1000] text-gray-900 tracking-tighter leading-none">You're All Set! 🎉</h1>
                        <p className="text-gray-400 text-lg md:text-xl font-medium leading-relaxed max-w-2xl mx-auto opacity-80">
                            Your restaurant menu has been fully processed by our AI. Your digital menu is now live.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 justify-center w-full max-w-3xl">
                        <button
                            onClick={handleVisitWebsite}
                            className="flex-1 bg-blue-600 text-white py-6 px-10 rounded-[2rem] font-[1000] text-xl tracking-tighter hover:bg-blue-700 transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            <FiExternalLink className="text-2xl" /> VISIT WEBSITE 
                        </button>
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="flex-1 bg-gray-900 text-white py-6 px-10 rounded-[2rem] font-[1000] text-xl tracking-tighter hover:bg-black transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            <FiLayout className="text-2xl" /> DASHBOARD
                        </button>
                    </div>

                    <div className="pt-6 flex items-center gap-3 text-gray-300 font-bold uppercase tracking-[0.2em] text-[10px] opacity-40">
                        <div className="w-8 h-px bg-gray-100"></div>
                        Journey Complete
                        <div className="w-8 h-px bg-gray-100"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

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
        <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-lg">
                <div className="flex justify-center mb-6">
                    <FiCheckCircle className="text-8xl text-green-500" />
                </div>
                <h1 className="text-4xl font-bold text-gray-800 mb-4">You're All Set! 🎉</h1>
                <p className="text-gray-600 text-lg mb-8">
                    Your restaurant menu has been processed and your AI website is ready.
                </p>

                <div className="flex flex-col gap-4">
                    <button
                        onClick={handleVisitWebsite}
                        className="bg-blue-600 text-white py-4 px-8 rounded-xl font-bold text-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
                    >
                        Visit Your Website <FiExternalLink />
                    </button>
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="text-gray-500 hover:text-gray-700 font-medium"
                    >
                        Go to Admin Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}

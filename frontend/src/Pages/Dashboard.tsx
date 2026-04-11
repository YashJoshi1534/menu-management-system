import { useEffect, useState } from "react";
import { FiMapPin, FiCoffee, FiLayers, FiBarChart2, FiArrowRight, FiGrid } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
    const { business } = useAuth();
    const navigate = useNavigate();

    // Stats State
    const [stats, setStats] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        if (!business) {
            navigate("/");
            return;
        }
        fetchStats();
    }, [business, navigate]);

    const fetchStats = async () => {
        if (!business?.businessId) return;
        setLoadingStats(true);
        try {
            const res = await api.get(`/businesses/${business.businessId}/stats`);
            setStats(res.data);
        } catch (error) {
            console.error("Failed to fetch stats", error);
        } finally {
            setLoadingStats(false);
        }
    };

    const renderOverview = () => (
        <div className="h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-1000 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative pb-16">
            <style>
                {`
                @keyframes mesh {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .mesh-bg {
                    background: linear-gradient(-45deg, #f8fafc, #eff6ff, #f1f5f9, #ffffff);
                    background-size: 400% 400%;
                    animation: mesh 15s ease infinite;
                }
                @keyframes pulse-soft {
                    0%, 100% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.2); opacity: 1; }
                }
                .pulse-dot {
                    animation: pulse-soft 2s infinite;
                }
                `}
            </style>

            {/* Header */}
            <div className="text-center space-y-1 mb-12 shrink-0">
                <h1 className="text-5xl font-[1000] text-gray-900 tracking-tighter">
                    Welcome, <span className="text-blue-600 drop-shadow-sm">{business?.contactName}</span>
                </h1>
                <div className="flex items-center justify-center gap-3">
                    <div className="h-px w-6 bg-gray-200" />
                    <p className="text-xs text-gray-400 font-black uppercase tracking-[0.4em]">Business Command Center</p>
                    <div className="h-px w-6 bg-gray-200" />
                </div>
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 w-full max-w-6xl shrink-0">
                
                {/* Main Featured Card: Total Scans */}
                <div className="md:col-span-2 md:row-span-2 bg-white/60 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/80 shadow-2xl shadow-blue-100/20 group relative overflow-hidden flex flex-col justify-between min-h-[360px]">
                    
                    <div>
                        <div className="p-5 bg-blue-600 text-white rounded-2xl w-fit shadow-xl shadow-blue-500/30 group-hover:scale-110 transition-transform duration-500">
                            <FiBarChart2 size={32} />
                        </div>
                        <p className="mt-8 text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Insights Overview</p>
                        <h3 className="text-xl font-bold text-gray-600">Total Customer Scans</h3>
                    </div>

                    <div className="flex items-baseline gap-4 mt-auto">
                        <h4 className="text-8xl font-[1000] text-gray-900 tracking-tighter">
                            {loadingStats ? "..." : (stats?.totalScans || 0).toLocaleString()}
                        </h4>
                        <div className="flex flex-col">
                            <span className="text-blue-600 font-black text-lg">+12%</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">vs last week</span>
                        </div>
                    </div>
                </div>

                {/* Secondary Cards */}
                <div className="md:col-span-1 bg-white/40 backdrop-blur-2xl p-7 rounded-[2.5rem] border border-white/60 shadow-xl shadow-gray-200/20 group hover:bg-white/60 transition-all duration-500 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                            <FiMapPin size={20} />
                        </div>
                    </div>
                    <div className="mt-6">
                        <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">Active Outlets</h5>
                        <h6 className="text-4xl font-black text-gray-900 mt-1">{loadingStats ? "..." : (stats?.outlets || 0)}</h6>
                    </div>
                </div>

                <div className="md:col-span-1 bg-white/40 backdrop-blur-2xl p-7 rounded-[2.5rem] border border-white/60 shadow-xl shadow-gray-200/20 group hover:bg-white/60 transition-all duration-500 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-all duration-500">
                            <FiCoffee size={20} />
                        </div>
                    </div>
                    <div className="mt-6">
                        <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Dishes</h5>
                        <h6 className="text-4xl font-black text-gray-900 mt-1">{loadingStats ? "..." : (stats?.dishes || 0)}</h6>
                    </div>
                </div>

                <div className="md:col-span-1 bg-white/40 backdrop-blur-2xl p-7 rounded-[2.5rem] border border-white/60 shadow-xl shadow-gray-200/20 group hover:bg-white/60 transition-all duration-500 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="p-3 bg-pink-50 text-pink-600 rounded-xl group-hover:bg-pink-600 group-hover:text-white transition-all duration-500">
                            <FiLayers size={20} />
                        </div>
                    </div>
                    <div className="mt-6">
                        <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">Categories</h5>
                        <h6 className="text-4xl font-black text-gray-900 mt-1">{loadingStats ? "..." : (stats?.categories || 0)}</h6>
                    </div>
                </div>

                {/* Quick Action Card (Final Slot) */}
                <button
                    onClick={() => navigate("/view-outlets")}
                    className="md:col-span-1 bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 shadow-2xl shadow-blue-900/10 group hover:bg-blue-600 transition-all duration-500 flex flex-col justify-between items-start text-left relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FiArrowRight size={80} />
                    </div>
                    <div className="p-3 bg-white/10 text-white rounded-xl">
                        <FiGrid size={24} />
                    </div>
                    <div className="mt-auto">
                        <h5 className="text-sm font-black text-blue-400 group-hover:text-white/80 transition-colors uppercase tracking-widest">Quick Access</h5>
                        <h6 className="text-xl font-bold text-white mt-1">Your Outlets & QR Codes</h6>
                    </div>
                </button>
            </div>

            {/* Branding Footer */}
            <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
                <div className="inline-flex flex-col items-center gap-2 opacity-40">
                    <div className="h-px w-10 bg-gray-200" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em]">POWERED BY APNA STORE</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-[calc(100vh-76px)] overflow-hidden mesh-bg selection:bg-blue-100">
            <div className="h-full">
                {renderOverview()}
            </div>
        </div>
    );
}

import { useState, useEffect } from "react";
import api from "../api/client";
import { FiEdit2, FiX, FiBriefcase, FiArrowRight, FiUser, FiPhone, FiMail, FiTag, FiCheck } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function ConfigureOutlets() {
    const navigate = useNavigate();
    const { business } = useAuth();
    const [businessForm, setBusinessForm] = useState<any>({});
    const [businessTypes, setBusinessTypes] = useState<any[]>([]);
    const [isEditingBusiness, setIsEditingBusiness] = useState(false);
    const [loadingBusinessSave, setLoadingBusinessSave] = useState(false);
    const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false);
    const [outletCount, setOutletCount] = useState<number | null>(null);

    useEffect(() => {
        if (!business) return;
        setBusinessForm(business);
        fetchBusinessTypes();
        fetchOutletCount();
    }, [business]);

    const fetchOutletCount = async () => {
        if (!business?.businessId) return;
        try {
            const res = await api.get(`/businesses/${business.businessId}/outlets`, {
                params: { page: 1, limit: 1 }
            });
            setOutletCount(res.data.total);
        } catch (error) {
            console.error("Failed to fetch outlet count", error);
        }
    };

    const fetchBusinessTypes = async () => {
        try {
            const res = await api.get("/admin/business-types");
            setBusinessTypes(res.data || []);
        } catch (error) {
            setBusinessTypes([{ id: "1", name: "Restaurant" }, { id: "2", name: "Cafe" }, { id: "3", name: "Bar" }]);
        }
    };

    const handleUpdateBusiness = async () => {
        setLoadingBusinessSave(true);
        try {
            await api.put(`/auth/me/${business?.businessId}`, businessForm);
            toast.success("Business updated! ✨");
            setIsEditingBusiness(false);
            setIsBusinessModalOpen(false);
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Update failed");
        } finally {
            setLoadingBusinessSave(false);
        }
    };

    const renderBusinessModal = () => {
        if (!isBusinessModalOpen) return null;

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white rounded-[3rem] p-0 max-w-4xl w-full shadow-2xl relative animate-in zoom-in-95 duration-300 overflow-hidden max-h-[90vh] flex flex-col">
                    {/* Header with Background */}
                    <div className="relative h-40 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 shrink-0">
                        <button 
                            onClick={() => {
                                setIsBusinessModalOpen(false);
                                setIsEditingBusiness(false);
                            }}
                            className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors z-20"
                        >
                            <FiX size={24} />
                        </button>
                        
                        <div className="absolute bottom-8 left-10 text-white">
                            <h2 className="text-3xl font-black tracking-tight">Business Profile</h2>
                            <p className="text-blue-100 font-medium">Manage your core business information</p>
                        </div>

                        {!isEditingBusiness && (
                            <button
                                onClick={() => setIsEditingBusiness(true)}
                                className="absolute -bottom-6 right-10 bg-white text-blue-600 px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-slate-50 transition-all hover:-translate-y-1 active:scale-95 border border-blue-100"
                            >
                                <div className="flex items-center gap-2">
                                    <FiEdit2 /> Edit Profile
                                </div>
                            </button>
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="p-12 pt-16 overflow-y-auto scrollbar-hide flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {[
                                { label: "Business Name", value: businessForm?.name, icon: <FiBriefcase />, field: "name" },
                                { label: "Email Address", value: businessForm?.email, icon: <FiMail />, field: "email", disabled: true },
                                { label: "Contact Person", value: businessForm?.contactName, icon: <FiUser />, field: "contactName" },
                                { label: "Business Phone", value: businessForm?.phone, icon: <FiPhone />, field: "phone" },
                                { label: "Business Type", value: businessTypes.find(t => t.id === businessForm?.businessTypeId || t.typeId === businessForm?.businessTypeId)?.name || "Not Set", icon: <FiTag />, field: "businessTypeId", isSelect: true },
                            ].map((item, idx) => (
                                <div key={idx} className={`space-y-3 group ${item.disabled ? 'opacity-70' : ''}`}>
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                        {item.icon} {item.label}
                                    </label>
                                    {isEditingBusiness && !item.disabled ? (
                                        item.isSelect ? (
                                            <select
                                                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-800 focus:ring-4 focus:ring-slate-100 outline-none transition-all appearance-none"
                                                value={businessForm[item.field] || ""}
                                                onChange={e => setBusinessForm({ ...businessForm, [item.field]: e.target.value })}
                                            >
                                                <option value="">Select a type</option>
                                                {businessTypes.map(type => (
                                                    <option key={type.id || type.typeId} value={type.id || type.typeId}>{type.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type={item.field === "email" ? "email" : "text"}
                                                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-800 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                                                value={businessForm[item.field] || ""}
                                                onChange={e => setBusinessForm({ ...businessForm, [item.field]: e.target.value })}
                                            />
                                        )
                                    ) : (
                                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl font-bold text-gray-800 transition-all group-hover:border-slate-200 group-hover:bg-slate-50/10">
                                            {item.value || "Not Set"}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {isEditingBusiness && (
                            <div className="mt-12 pt-10 border-t border-gray-100 flex items-center gap-4">
                                <button
                                    onClick={handleUpdateBusiness}
                                    disabled={loadingBusinessSave}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 disabled:opacity-70"
                                >
                                    {loadingBusinessSave ? (
                                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <><FiCheck size={24} /> Save Changes</>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditingBusiness(false);
                                        setBusinessForm({ ...business });
                                    }}
                                    className="px-10 bg-gray-100 hover:bg-gray-200 text-gray-600 py-5 rounded-[2rem] font-black text-lg transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-[calc(100vh-76px)] bg-gray-50 p-0 md:p-8 relative overflow-y-auto animate-in fade-in duration-500 scrollbar-hide">
            <div className="max-w-6xl mx-auto py-12 px-4 space-y-12 pb-24">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* Outlets Overview Card */}
                    <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-xl border border-white p-10 group hover:-translate-y-1 transition-all duration-500 min-h-[480px] flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm mb-10 group-hover:scale-110 transition-transform">
                            <FiBriefcase size={32} />
                        </div>
                        <h3 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">Outlets</h3>
                        <p className="text-gray-500 text-lg mb-6 leading-relaxed max-w-sm">
                            Manage and view all your registered outlet locations.
                        </p>

                        {outletCount !== null && (
                            <div className="mb-8 px-5 py-2 bg-blue-50 text-blue-600 rounded-full font-black text-xs uppercase tracking-widest border border-blue-100 animate-in zoom-in-95 duration-500">
                                Total Outlets: {outletCount}
                            </div>
                        )}

                        <button
                            onClick={() => navigate("/view-outlets")}
                            className="mt-auto w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-200 active:scale-95"
                        >
                            View Outlets <FiArrowRight />
                        </button>
                    </div>

                    {/* Business Details Overview Card */}
                    <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-xl border border-white p-10 group hover:-translate-y-1 transition-all duration-500 min-h-[480px] flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm mb-10 group-hover:scale-110 transition-transform">
                            <FiBriefcase size={32} />
                        </div>
                        <h3 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">Business Detail</h3>
                        <p className="text-gray-500 text-lg mb-10 leading-relaxed max-w-sm">
                            Update your business information and contact details.
                        </p>

                        <div className="mb-10 text-gray-400 font-bold uppercase tracking-widest text-xs">
                            {business?.name}
                        </div>

                        <button
                            onClick={() => setIsBusinessModalOpen(true)}
                            className="mt-auto w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-200 active:scale-95"
                        >
                            View Business Detail <FiArrowRight />
                        </button>
                    </div>
                </div>
            </div>
            {renderBusinessModal()}
        </div>
    );
}

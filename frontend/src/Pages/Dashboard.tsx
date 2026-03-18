import { useState, useEffect } from "react";
import api from "../api/client";
import { 
    FiPlus, FiShoppingBag, FiUser, FiArrowLeft, FiChevronRight, 
    FiPlayCircle, FiExternalLink, FiEdit2, FiX, FiCheck, 
    FiChevronDown, FiTag, FiPhone, FiMail, FiSearch 
} from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import useDebounce from "../hooks/useDebounce";

type ViewType = "overview" | "stores" | "business";

export default function Dashboard() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Derive activeView from route
    const getActiveView = (): ViewType => {
        if (location.pathname === "/view-stores") return "stores";
        if (location.pathname === "/business-details") return "business";
        return "overview";
    };

    const activeView = getActiveView();
    const [loading, setLoading] = useState(false);
    const [stores, setStores] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 400);
    const [isEditingBusiness, setIsEditingBusiness] = useState(false);
    const [businessData, setBusinessData] = useState({
        name: "",
        businessType: "",
        phone: ""
    });
    const [businessTypes, setBusinessTypes] = useState<string[]>([]);
    const [updateLoading, setUpdateLoading] = useState(false);
    const { business, setSelectedStoreUid } = useAuth();

    useEffect(() => {
        if (!business) {
            navigate("/");
            return;
        }

        // Clear abandoned store setup drafts and requests when arriving at Dashboard
        const cleanupKeys = ["store_setup_name", "store_setup_address", "store_setup_city", "store_setup_zip", "requestId"];
        cleanupKeys.forEach(key => localStorage.removeItem(key));
        
        const loadInitialData = async () => {
            setLoading(true);
            try {
                await Promise.all([
                    fetchStores(debouncedSearchQuery),
                    fetchBusinessDetails(),
                    fetchBusinessTypes()
                ]);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [business]);

    // Fetch stores when search changes
    useEffect(() => {
        if (business) {
            fetchStores(debouncedSearchQuery);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearchQuery]);

    const fetchStores = async (searchTerm: string = "") => {
        try {
            const endpoint = `/businesses/${business?.businessId}/stores${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ""}`;
            const res = await api.get(endpoint);
            const activeStores = res.data.filter((s: any) => s.isActive !== false);
            setStores(activeStores);
        } catch (error) {
            toast.error("Failed to fetch stores");
        }
    };

    const fetchBusinessDetails = async () => {
        try {
            const res = await api.get(`/auth/me/${business?.businessId}`);
            setBusinessData({
                name: res.data.name || "",
                businessType: res.data.businessType || "",
                phone: res.data.phone || ""
            });
        } catch (error) {
            console.error("Failed to fetch business details", error);
        }
    };

    const fetchBusinessTypes = async () => {
        try {
            const res = await api.get("/admin/business-types");
            setBusinessTypes(res.data || []);
        } catch (error) {
            setBusinessTypes(["Restaurant", "Cafe", "Bar", "Hotel", "Other"]);
        }
    };

    const handleUpdateBusiness = async () => {
        setUpdateLoading(true);
        try {
            await api.put(`/auth/me/${business?.businessId}`, businessData);
            toast.success("Business updated! ✨");
            setIsEditingBusiness(false);
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Update failed");
        } finally {
            setUpdateLoading(false);
        }
    };

    const startRequest = async (storeUid: string) => {
        setLoading(true);
        try {
            // Try resuming active request
            try {
                const activeRes = await api.get(`/stores/${storeUid}/requests/active`);
                if (activeRes.data && activeRes.data.requestId) {
                    localStorage.setItem("requestId", activeRes.data.requestId);
                    setSelectedStoreUid(storeUid);
                    toast.success("Resuming existing process! 🚀");
                    
                    const step = activeRes.data.currentStep;
                    const path = step === 1 ? "/menu-upload" : 
                                 step === 2 ? "/dish-generation" : 
                                 step === 3 ? "/dish-generation" : "/completion";
                                 
                    setTimeout(() => navigate(path), 800);
                    return;
                }
            } catch (e: any) {
                // If 404, we just fall through to start a new request
                if (e.response && e.response.status !== 404) {
                    console.error("Error checking active request:", e);
                }
            }

            // Start new request if no active one found
            const res = await api.post(`/stores/${storeUid}/requests`);
            localStorage.setItem("requestId", res.data.requestId);
            setSelectedStoreUid(storeUid);
            toast.success("Request Started! 🚀");
            setTimeout(() => navigate("/menu-upload"), 800);
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Failed to start request");
        } finally {
            setLoading(false);
        }
    };

    const renderOverview = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mx-auto py-10">
            {/* Stores Card */}
            <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-xl border border-white p-10 flex flex-col items-center text-center group hover:-translate-y-2 transition-all duration-300">
                <div className="bg-blue-50 w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-inner group-hover:bg-blue-100 transition-colors">
                    <FiShoppingBag className="text-4xl text-blue-600" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Stores</h2>
                <p className="text-gray-500 mb-8 font-medium">Manage and view all your registered store locations.</p>
                <div className="flex items-center gap-2 mb-10 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-bold">
                    <span>{stores.length} Registered Stores</span>
                </div>
                <button
                    onClick={() => navigate("/view-stores")}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95"
                >
                    View Stores <FiChevronRight />
                </button>
            </div>

            {/* Business Card */}
            <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-xl border border-white p-10 flex flex-col items-center text-center group hover:-translate-y-2 transition-all duration-300">
                <div className="bg-indigo-50 w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-inner group-hover:bg-indigo-100 transition-colors">
                    <FiUser className="text-4xl text-indigo-600" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Business Detail</h2>
                <p className="text-gray-500 mb-8 font-medium">Update your business information and contact details.</p>
                <div className="h-[2.5rem] mb-10 text-gray-400 font-bold">{businessData.name || "N/A"}</div>
                <button
                    onClick={() => navigate("/business-details")}
                    className="w-full bg-gray-900 hover:bg-black text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95"
                >
                    View Business Detail <FiChevronRight />
                </button>
            </div>
        </div>
    );

    const renderStoresView = () => (
        <div className="space-y-10 py-6 animate-in fade-in duration-500 max-w-none mx-auto px-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <button 
                        onClick={() => navigate("/dashboard")}
                        className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-colors group whitespace-nowrap"
                    >
                        <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
                    </button>
                    <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
                    <div className="relative flex-1 sm:w-64 z-10">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search viewable stores..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-xl outline-none transition-all shadow-sm text-sm font-medium"
                        />
                    </div>
                </div>
                <button
                    onClick={() => {
                        setSelectedStoreUid(null);
                        navigate("/store-setup");
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 shrink-0"
                >
                    <FiPlus /> Add New Store
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {stores.map((store) => (
                    <div key={store.storeUid} className="relative bg-white/90 backdrop-blur-md rounded-[2rem] shadow-lg border border-white overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                        <button 
                            onClick={() => navigate(`/manage-menu/${store.storeUid}`)}
                            className="absolute top-6 right-6 w-10 h-10 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-xl flex items-center justify-center border border-gray-100/50 active:scale-90 transition-all z-10"
                            title="Edit Menu"
                        >
                            <FiEdit2 size={18} />
                        </button>

                        <div className="p-8">
                            <div className="flex items-center gap-5 mb-8">
                                {store.logoUrl ? (
                                    <img src={store.logoUrl} className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-sm" alt="" />
                                ) : (
                                    <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center border-2 border-white shadow-sm">
                                        <span className="text-indigo-600 font-extrabold text-2xl">{store.storeName?.charAt(0)}</span>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0 pr-8">
                                    <h3 className="text-2xl font-extrabold text-gray-900 truncate tracking-tight">{store.storeName}</h3>
                                    {(store.city || store.zipCode) && (
                                        <p className="text-sm text-gray-400 font-mono mt-1 opacity-70 truncate">
                                            {[store.city, store.zipCode].filter(Boolean).join(", ")}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <button
                                        onClick={() => startRequest(store.storeUid)}
                                        disabled={loading}
                                        className="w-full flex items-center justify-between p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-md group/btn mb-1"
                                    >
                                        <span className="flex items-center gap-3">
                                            <FiPlayCircle className="text-xl" /> Upload Menu Image
                                        </span>
                                        <FiChevronRight className="group-hover/btn:translate-x-1 transition-transform" />
                                    </button>
                                    <p className="text-[11px] text-gray-400 font-medium px-1 leading-tight">
                                        Upload your menu photo and we will automatically create your digital menu.
                                    </p>
                                </div>

                                <div>
                                    <a
                                        href={`/${store.storeUid}/${store.storeName}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 text-gray-500 hover:text-indigo-600 rounded-2xl font-bold border border-gray-200 transition-all group/link mb-1"
                                    >
                                        <span className="flex items-center gap-3">
                                            <FiExternalLink /> view live menu
                                        </span>
                                        <FiChevronRight className="transform group-hover/link:translate-x-1 transition-transform opacity-0 group-hover/link:opacity-100" />
                                    </a>
                                    <p className="text-[11px] text-gray-400 font-medium px-1 leading-tight">
                                        See your digital menu as customers will see it
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {stores.length === 0 && (
                <div className="bg-white/80 backdrop-blur-md p-16 rounded-[2.5rem] shadow-xl text-center border border-white">
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-4">No stores yet</h2>
                    <p className="text-gray-500 mb-10 max-w-md mx-auto text-lg leading-relaxed">Add your first store to start managing your digital menus and generating AI dish images.</p>
                    <button
                        onClick={() => {
                            setSelectedStoreUid(null);
                            navigate("/store-setup");
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl active:scale-95"
                    >
                        Setup Your First Store
                    </button>
                </div>
            )}
        </div>
    );

    const renderBusinessView = () => (
        <div className="w-full mx-auto py-6 space-y-10 animate-in fade-in duration-500">
            <button 
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-bold transition-colors group"
            >
                <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </button>

            <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-2xl border border-white p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8">
                    {!isEditingBusiness ? (
                        <button 
                            onClick={() => setIsEditingBusiness(true)}
                            className="p-4 bg-gray-50 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 rounded-2xl transition-all border border-transparent hover:border-indigo-100 shadow-sm"
                        >
                            <FiEdit2 className="text-xl" />
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsEditingBusiness(false)}
                                className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all shadow-sm"
                            >
                                <FiX className="text-xl" />
                            </button>
                            <button 
                                onClick={handleUpdateBusiness}
                                disabled={updateLoading}
                                className="p-4 bg-green-50 text-green-600 rounded-2xl hover:bg-green-100 transition-all disabled:opacity-50 shadow-sm"
                            >
                                {updateLoading ? <div className="w-5 h-5 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin"></div> : <FiCheck className="text-xl" />}
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-6 mb-12">
                    <div className="bg-indigo-100 w-20 h-20 rounded-3xl flex items-center justify-center shadow-inner">
                        <FiUser className="text-3xl text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Business Profile</h2>
                        <p className="text-gray-500 font-medium">Manage your core business identification info.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Business Name</label>
                        {isEditingBusiness ? (
                            <input 
                                type="text" 
                                className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800 transition-all text-lg shadow-inner"
                                value={businessData.name}
                                onChange={(e) => setBusinessData({...businessData, name: e.target.value})}
                            />
                        ) : (
                            <div className="flex items-center gap-4 bg-gray-50/50 p-5 rounded-2xl border border-gray-100/50">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                                <p className="text-2xl font-extrabold text-gray-900">{businessData.name || "N/A"}</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Business Type</label>
                        {isEditingBusiness ? (
                            <div className="relative">
                                <select 
                                    className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800 transition-all appearance-none cursor-pointer text-lg shadow-inner"
                                    value={businessData.businessType}
                                    onChange={(e) => setBusinessData({...businessData, businessType: e.target.value})}
                                >
                                    {businessTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <FiChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 bg-gray-50/50 p-5 rounded-2xl border border-gray-100/50">
                                <FiTag className="text-indigo-600 text-xl" />
                                <p className="text-xl font-bold text-gray-800">{businessData.businessType || "N/A"}</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Contact Phone</label>
                        {isEditingBusiness ? (
                            <input 
                                type="tel" 
                                className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800 transition-all text-lg shadow-inner"
                                value={businessData.phone}
                                maxLength={10}
                                onChange={(e) => setBusinessData({...businessData, phone: e.target.value.replace(/\D/g, "")})}
                            />
                        ) : (
                            <div className="flex items-center gap-4 bg-gray-50/50 p-5 rounded-2xl border border-gray-100/50">
                                <FiPhone className="text-indigo-600 text-xl" />
                                <p className="text-xl font-bold text-gray-800">{businessData.phone || "N/A"}</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 opacity-70">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Account Email</label>
                        <div className="flex items-center gap-4 p-5">
                            <FiMail className="text-gray-400 text-xl" />
                            <p className="text-xl font-bold text-gray-600">{business?.email}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-50 flex items-center justify-between text-gray-400 font-medium">
                    <p>Account ID: <span className="font-mono text-xs">{business?.businessId}</span></p>
                    <p>Created: {new Date().toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-[calc(100vh-76px)] bg-white p-4 md:p-8 relative overflow-hidden animate-in fade-in duration-700">
            {/* Background Decorations */}
                <div className="w-full h-full flex flex-col gap-6 overflow-y-auto scrollbar-hide">
                    {activeView === "overview" && renderOverview()}
                    {activeView === "stores" && renderStoresView()}
                    {activeView === "business" && renderBusinessView()}
                </div>
        </div>
    );
}

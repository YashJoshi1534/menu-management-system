import { useEffect, useState } from "react";
import { FiPlus, FiSearch, FiArrowRight, FiX, FiDownload, FiEdit2, FiCheck, FiMapPin, FiPhone, FiGlobe, FiClock, FiArrowLeft, FiSave } from "react-icons/fi";
import { QRCodeCanvas } from "qrcode.react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useDebounce } from "use-debounce";

interface Outlet {
    storeUid: string;
    storeName: string;
    address: string;
    city: string;
    zipCode: string;
    phone?: string;
    logoUrl?: string;
    isActive?: boolean;
    currency?: string;
}

export default function ViewOutlets() {
    const navigate = useNavigate();
    const { business, setSelectedOutletUid } = useAuth();

    // Outlet listing state
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
    const [pageLoading, setPageLoading] = useState(true);
    const [loadingOutlets, setLoadingOutlets] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10;

    // QR Code state
    const [qrModalOutlet, setQrModalOutlet] = useState<Outlet | null>(null);

    // Edit Outlet state
    const [editModalOutlet, setEditModalOutlet] = useState<Outlet | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const downloadQRCode = (outletName: string) => {
        const canvas = document.getElementById("qr-gen") as HTMLCanvasElement;
        if (!canvas) return;
        const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        let downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `${outletName.replace(/\s+/g, "_")}_QR.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    useEffect(() => {
        if (!business) {
            setPageLoading(false);
            navigate("/");
            return;
        }

        const loadInitialData = async () => {
            try {
                await fetchOutlets();
            } catch (error) {
                console.error("Initial data load failed", error);
            } finally {
                setPageLoading(false);
            }
        };

        loadInitialData();
    }, [business]);

    useEffect(() => {
        if (business) {
            fetchOutlets();
        }
    }, [business, currentPage, debouncedSearchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery]);

    const fetchOutlets = async () => {
        if (!business?.businessId) return;
        setLoadingOutlets(true);
        try {
            const res = await api.get(`/businesses/${business.businessId}/outlets`, {
                params: {
                    search: debouncedSearchQuery,
                    page: currentPage,
                    limit: limit
                }
            });
            setOutlets(res.data.outlets);
            setTotalPages(res.data.totalPages);
        } catch (error) {
            toast.error("Failed to fetch outlets");
        } finally {
            setLoadingOutlets(false);
        }
    };

    const handleEditClick = (outlet: Outlet) => {
        setEditModalOutlet(outlet);
        setEditForm({ ...outlet });
    };

    const handleUpdateOutlet = async () => {
        if (!editModalOutlet) return;
        setIsSavingEdit(true);
        try {
            await api.put(`/outlets/${editModalOutlet.storeUid}`, editForm);
            toast.success("Outlet updated successfully! ✨");
            setEditModalOutlet(null);
            fetchOutlets(); // Refresh list
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Update failed");
        } finally {
            setIsSavingEdit(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 selection:bg-indigo-100">
            <div className="transition-all duration-700 pb-24">
                <div className="space-y-12 py-8 animate-in fade-in duration-700 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header with Back Button */}
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={() => navigate("/configure-outlets")}
                            className="p-3 bg-white text-gray-400 hover:text-blue-600 rounded-2xl shadow-sm border border-gray-100 transition-all hover:-translate-x-1"
                        >
                            <FiArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                                {window.location.pathname.includes('manage-menu') ? 'Manage Menu' : 'Manage Outlets'}
                            </h1>
                            {window.location.pathname.includes('manage-menu') && (
                                <p className="text-gray-500 mt-1 font-medium px-1">Select an outlet to manage its categories and dishes</p>
                            )}
                        </div>
                    </div>

                    {/* Search and Add Button Area */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/60 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-xl font-black text-gray-900 tracking-tight px-2">Outlet List</h2>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="relative w-full sm:w-80 group">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search outlets..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 hover:border-indigo-300 focus:border-indigo-600 rounded-2xl outline-none transition-all shadow-sm text-sm font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="relative min-h-[400px]">
                        {loadingOutlets && (
                            <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-[3rem] transition-all">
                                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg"></div>
                                <p className="mt-4 text-blue-600 font-bold animate-pulse text-sm">Loading your outlets...</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                            {outlets.map((outlet) => (
                                <div key={outlet.storeUid} className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col gap-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/30 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-100/50 transition-colors" />
                                    
                                    {/* Header Part: Logo + Name + Edit Pencil */}
                                    <div className="flex items-start gap-5 relative">
                                        <div className="relative">
                                            {outlet.logoUrl ? (
                                                <img src={outlet.logoUrl} alt={outlet.storeName} className="w-20 h-20 rounded-[1.75rem] object-cover shadow-md bg-gray-50 border-4 border-white" />
                                            ) : (
                                                <div className="w-20 h-20 rounded-[1.75rem] bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-600 text-3xl font-black shadow-md border-4 border-white">
                                                    {outlet.storeName?.charAt(0)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 pt-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="text-2xl font-black text-gray-900 tracking-tight truncate leading-none">
                                                    {outlet.storeName}
                                                </h3>
                                                <button 
                                                    onClick={() => handleEditClick(outlet)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                                                >
                                                    <FiEdit2 size={18} />
                                                </button>
                                            </div>
                                            <p className="text-gray-400 text-sm font-medium truncate mt-2">
                                                {outlet.address}, {outlet.city}
                                            </p>
                                            <div className="mt-4 flex items-center gap-2 w-fit px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100 group-hover:bg-white transition-colors">
                                                <div className={`w-2 h-2 rounded-full ${outlet.isActive ? 'bg-green-500 animate-pulse ring-4 ring-green-100' : 'bg-gray-300'}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${outlet.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                                                    STATUS: {outlet.isActive ? 'LIVE' : 'OFFLINE'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action List */}
                                    <div className="space-y-4 relative">
                                        <button
                                            onClick={async () => {
                                                setSelectedOutletUid(outlet.storeUid);
                                                try {
                                                    const res = await api.post(`/outlets/${outlet.storeUid}/requests`);
                                                    if (res.data.requestId) {
                                                        localStorage.setItem("requestId", res.data.requestId);
                                                        navigate("/menu-upload");
                                                    } else {
                                                        toast.error("Failed to start process");
                                                    }
                                                } catch (error) {
                                                    console.error("Request creation failed", error);
                                                    toast.error("Process initialization failed");
                                                }
                                            }}
                                            className="w-full flex flex-col items-start p-5 bg-blue-50/50 hover:bg-blue-600 hover:text-white border border-blue-100/50 rounded-[1.5rem] transition-all duration-300 group/row text-left shadow-sm hover:shadow-blue-200"
                                        >
                                            <div className="flex items-center gap-4 w-full">
                                                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md group-hover/row:bg-white group-hover/row:text-blue-600 transition-colors">
                                                    <FiPlus size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-blue-900 group-hover/row:text-white text-base transition-colors">Upload Menu Image</span>
                                                        <FiArrowRight className="text-blue-400 group-hover/row:text-white group-hover/row:translate-x-1 transition-all" />
                                                    </div>
                                                    <p className="text-xs text-blue-700/70 group-hover/row:text-blue-100 font-medium mt-0.5 transition-colors">
                                                        Upload your menu photo and we'll automatically create your digital menu
                                                    </p>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setSelectedOutletUid(outlet.storeUid);
                                                navigate(`/manage-menu/${outlet.storeUid}`);
                                            }}
                                            className="w-full flex flex-col items-start p-5 hover:bg-gray-900 hover:text-white border border-gray-100 rounded-[1.5rem] transition-all duration-300 group/row text-left shadow-sm hover:shadow-xl"
                                        >
                                            <div className="flex items-center gap-4 w-full">
                                                <div className="p-2.5 bg-gray-100 text-gray-600 rounded-xl group-hover/row:bg-gray-800 group-hover/row:text-white transition-colors">
                                                    <FiSave size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-gray-800 group-hover/row:text-white text-base transition-colors">Add, Update or remove items from your menu</span>
                                                        <FiArrowRight className="text-gray-400 group-hover/row:text-white group-hover/row:translate-x-1 transition-all" />
                                                    </div>
                                                    <p className="text-xs text-gray-500 group-hover/row:text-gray-400 font-medium mt-0.5 transition-colors">
                                                        Edit Prices & Images
                                                    </p>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setQrModalOutlet(outlet)}
                                            className="w-full flex flex-col items-start p-5 hover:bg-gray-50 border border-gray-100 rounded-[1.5rem] transition-all duration-300 group/row text-left shadow-sm hover:border-indigo-200"
                                        >
                                            <div className="flex items-center gap-4 w-full">
                                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                    <FiDownload size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-gray-800 text-base transition-colors">QR Menu</span>
                                                        <FiArrowRight className="text-gray-400 group-hover/row:translate-x-1 transition-all" />
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-medium mt-0.5 transition-colors">
                                                        Download QR Code
                                                    </p>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => window.open(`/${outlet.storeUid}/${outlet.storeName.replace(/\s+/g, '-')}`, '_blank')}
                                            className="w-full flex flex-col items-start p-5 hover:bg-gray-50 border border-gray-100 rounded-[1.5rem] transition-all duration-300 group/row text-left shadow-sm hover:border-blue-200"
                                        >
                                            <div className="flex items-center gap-4 w-full">
                                                <div className="p-2.5 bg-gray-100 text-gray-600 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                    <FiArrowRight size={20} className="rotate-[-45deg]" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-gray-800 text-base transition-colors">View Live Menu</span>
                                                        <FiArrowRight className="text-gray-400 group-hover/row:translate-x-1 transition-all" />
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-medium mt-0.5 transition-colors">
                                                        View Website Link
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Empty State */}
                        {outlets.length === 0 && !loadingOutlets && (
                            <div className="bg-white p-16 rounded-[4rem] shadow-xl text-center border border-gray-100 mt-8 animate-in zoom-in-95 duration-500">
                                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-white shadow-lg">
                                    <FiPlus className="text-4xl text-blue-600" />
                                </div>
                                <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">No outlets found</h2>
                                <button
                                    onClick={() => navigate("/outlet-setup")}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-3xl font-bold text-lg transition-all shadow-xl shadow-blue-200 active:scale-95"
                                >
                                    Create Your First Outlet
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/60 shadow-sm">
                            <div className="text-sm text-gray-500 font-bold tracking-tight px-4">
                                Page <span className="text-blue-600">{currentPage}</span> of <span className="text-gray-900">{totalPages}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1 || loadingOutlets}
                                    className="px-6 py-3 rounded-2xl bg-white border border-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
                                >
                                    Prev
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages || loadingOutlets}
                                    className="px-6 py-3 rounded-2xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Outlet Modal */}
            {editModalOutlet && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] p-8 md:p-12 max-w-2xl w-full shadow-2xl relative animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] scrollbar-hide">
                        <button 
                            onClick={() => setEditModalOutlet(null)}
                            className="absolute top-8 right-8 p-3 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                        >
                            <FiX size={24} />
                        </button>
                        
                        <div className="mb-10">
                            <h3 className="text-3xl font-black text-gray-900 tracking-tight">Edit Outlet</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <FiGlobe /> Outlet Name
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-800 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                    value={editForm.storeName || ""}
                                    onChange={e => setEditForm({ ...editForm, storeName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <FiPhone /> Contact Phone
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-800 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                    value={editForm.phone || ""}
                                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2 space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <FiMapPin /> Street Address
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-800 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                    value={editForm.address || ""}
                                    onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400">City</label>
                                <input
                                    type="text"
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-800 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                    value={editForm.city || ""}
                                    onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Zip Code</label>
                                <input
                                    type="text"
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-800 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                    value={editForm.zipCode || ""}
                                    onChange={e => setEditForm({ ...editForm, zipCode: e.target.value })}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <FiClock /> Active Status
                                </label>
                                <div className="flex items-center gap-4 py-2">
                                    <button 
                                        onClick={() => setEditForm({ ...editForm, isActive: true })}
                                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${editForm.isActive ? 'bg-green-600 text-white shadow-lg ring-4 ring-green-100' : 'bg-gray-100 text-gray-500'}`}
                                    >
                                        Live
                                    </button>
                                    <button 
                                        onClick={() => setEditForm({ ...editForm, isActive: false })}
                                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${!editForm.isActive ? 'bg-red-600 text-white shadow-lg ring-4 ring-red-100' : 'bg-gray-100 text-gray-500'}`}
                                    >
                                        Offline
                                    </button>
                                </div>
                            </div>

                        </div>

                        <div className="mt-12 flex items-center gap-4">
                            <button
                                onClick={handleUpdateOutlet}
                                disabled={isSavingEdit}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 disabled:opacity-70"
                            >
                                {isSavingEdit ? (
                                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <><FiCheck size={24} /> Update Outlet</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Modal (same as Dashboard) */}
            {qrModalOutlet && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-300">
                        <button 
                            onClick={() => setQrModalOutlet(null)}
                            className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                        >
                            <FiX size={24} />
                        </button>
                        <div className="text-center space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{qrModalOutlet.storeName}</h3>
                                <p className="text-sm text-gray-500 font-medium">Scan QR to view menu online</p>
                            </div>
                            <div className="p-6 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex items-center justify-center">
                                <QRCodeCanvas
                                    id="qr-gen"
                                    value={`${window.location.origin}/${qrModalOutlet.storeUid}/${qrModalOutlet.storeName.replace(/\s+/g, '-')}`}
                                    size={256}
                                    level="H"
                                    includeMargin={true}
                                    className="rounded-2xl shadow-sm"
                                />
                            </div>
                            <button
                                onClick={() => downloadQRCode(qrModalOutlet.storeName)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-5 rounded-3xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-200 active:scale-95"
                            >
                                <FiDownload size={20} /> Download QR Code
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

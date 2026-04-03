import { FiPlus, FiSearch, FiArrowRight, FiX, FiDownload, FiEdit2, FiCheck, FiMapPin, FiPhone, FiGlobe, FiClock, FiSave, FiRefreshCw, FiUploadCloud } from "react-icons/fi";
import { useRef, useEffect, useState } from "react";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { QRCodeCanvas } from "qrcode.react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useDebounce } from "use-debounce";
import { jsPDF } from "jspdf";
import Breadcrumb from "../components/Breadcrumb";

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

    // Analytics state
    const [analyticsOutlet, setAnalyticsOutlet] = useState<Outlet | null>(null);
    const [analyticsData, setAnalyticsData] = useState<Record<string, any[]>>({});
    const [loadingAnalytics, setLoadingAnalytics] = useState<Record<string, boolean>>({});

    // Edit Outlet state
    const [editModalOutlet, setEditModalOutlet] = useState<Outlet | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
    const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
    const [isDraggingLogo, setIsDraggingLogo] = useState(false);
    const editLogoInputRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        if (!business) {
            setPageLoading(false);
            navigate("/");
            return;
        }

        const syncData = async () => {
            await fetchOutlets();
            // Only turn off full page loading after first fetch
            if (pageLoading) setPageLoading(false);
        };

        syncData();
    }, [business, currentPage, debouncedSearchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery]);

    const fetchAnalytics = async (outletUid: string) => {
        setLoadingAnalytics(prev => ({ ...prev, [outletUid]: true }));
        try {
            const res = await api.get(`/outlets/${outletUid}/analytics`);
            setAnalyticsData(prev => ({ ...prev, [outletUid]: res.data }));
        } catch (error) {
            console.error("Failed to fetch analytics", error);
        } finally {
            setLoadingAnalytics(prev => ({ ...prev, [outletUid]: false }));
        }
    };

    const toggleAnalytics = (outlet: Outlet) => {
        setAnalyticsOutlet(outlet);
        fetchAnalytics(outlet.storeUid);
    };

    const downloadQRAsPDF = (outletName: string) => {
        const canvas = document.getElementById("qr-gen") as HTMLCanvasElement;
        if (!canvas) {
            toast.error("QR Code not ready");
            return;
        }

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();

        // Header: Outlet Name
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(28);
        pdf.setTextColor(31, 41, 55); // text-gray-800
        const titleWidth = pdf.getTextWidth(outletName);
        pdf.text(outletName, (pageWidth - titleWidth) / 2, 40);

        // QR Code Image
        const qrSize = 120;
        pdf.addImage(imgData, 'PNG', (pageWidth - qrSize) / 2, 60, qrSize, qrSize);

        // Branding: Powered by Apna Store
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(156, 163, 175); // text-gray-400
        const brandingText = "POWERED BY APNA STORE";
        const brandWidth = pdf.getTextWidth(brandingText);
        pdf.text(brandingText, (pageWidth - brandWidth) / 2, 200);

        // Aesthetic Line
        pdf.setDrawColor(229, 231, 235); // border-gray-200
        pdf.line((pageWidth - 20) / 2, 190, (pageWidth + 20) / 2, 190);

        pdf.save(`${outletName.replace(/\s+/g, '_')}_Menu_QR.pdf`);
    };

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
        setEditLogoFile(null);
        setEditLogoPreview(outlet.logoUrl || null);
    };

    const handleLogoDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingLogo(true);
    };

    const handleLogoDragLeave = () => {
        setIsDraggingLogo(false);
    };

    const handleLogoDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingLogo(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
            setEditLogoFile(file);
            setEditLogoPreview(URL.createObjectURL(file));
            toast.success("Logo dropped! ✨");
        }
    };

    const handleUpdateOutlet = async () => {
        if (!editModalOutlet) return;
        setIsSavingEdit(true);
        try {
            // 1. Update Logo if a new one was selected
            if (editLogoFile) {
                const logoData = new FormData();
                logoData.append("logo", editLogoFile);
                await api.put(`/outlets/${editModalOutlet.storeUid}/logo`, logoData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
            }

            // 2. Update other details
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { storeUid, logoUrl, ...updatePayload } = editForm;
            await api.put(`/outlets/${editModalOutlet.storeUid}`, updatePayload);
            
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
                <div className="space-y-4 pt-4 pb-12 animate-in fade-in duration-700 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Proper Breadcrumb */}
                    <Breadcrumb
                        items={[{ label: 'Business Profile', path: '/configure-outlets' }, { label: window.location.pathname.includes('manage-menu') ? 'Manage Menu' : 'Manage Outlets' }]}
                    />

                    {/* Header with Add New Store Button */}
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                                {window.location.pathname.includes('manage-menu') ? 'Manage Menu' : 'Manage Outlets'}
                            </h1>
                            {window.location.pathname.includes('manage-menu') && (
                                <p className="text-gray-500 mt-1 font-medium px-1">Select an outlet to manage its categories and dishes</p>
                            )}
                        </div>

                        {!window.location.pathname.includes('manage-menu') && (
                            <button
                                onClick={() => {
                                    setSelectedOutletUid(null);
                                    // Clear setup specific localStorage
                                    localStorage.removeItem("outlet_setup_name");
                                    localStorage.removeItem("outlet_setup_address");
                                    localStorage.removeItem("outlet_setup_city");
                                    localStorage.removeItem("outlet_setup_zip");
                                    localStorage.removeItem("outlet_setup_lat");
                                    localStorage.removeItem("outlet_setup_lng");
                                    navigate("/outlet-setup");
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <FiPlus size={20} /> Add New Store
                            </button>
                        )}
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
                                            className="w-full flex flex-col items-start p-5 hover:bg-gray-50 border border-gray-100 rounded-[1.5rem] transition-all duration-300 group/row text-left shadow-sm hover:border-gray-200"
                                        >
                                            <div className="flex items-center gap-4 w-full">
                                                <div className="p-2.5 bg-gray-50 text-gray-600 rounded-xl group-hover/row:bg-gray-900 group-hover/row:text-white transition-colors">
                                                    <FiSave size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-gray-800 group-hover/row:text-black text-base transition-colors">Edit Menu</span>
                                                        <FiArrowRight className="text-gray-400 group-hover/row:text-black group-hover/row:translate-x-1 transition-all" />
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-medium mt-0.5 transition-colors">
                                                        Add, Update or remove items
                                                    </p>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setQrModalOutlet(outlet)}
                                            className="w-full flex flex-col items-start p-5 hover:bg-gray-50 border border-gray-100 rounded-[1.5rem] transition-all duration-300 group/row text-left shadow-sm hover:border-indigo-200"
                                        >
                                            <div className="flex items-center gap-4 w-full">
                                                <div className="p-2.5 bg-gray-50 text-indigo-600 rounded-xl group-hover/row:bg-indigo-600 group-hover/row:text-white transition-colors">
                                                    <FiDownload size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-gray-800 text-base transition-colors">QR Menu</span>
                                                        <FiArrowRight className="text-gray-400 group-hover/row:translate-x-1 transition-all" />
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-medium mt-0.5 transition-colors">
                                                        Print & Download
                                                    </p>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => toggleAnalytics(outlet)}
                                            className="w-full flex flex-col items-start p-5 hover:bg-indigo-50 border border-gray-100 rounded-[1.5rem] transition-all duration-300 group/row text-left shadow-sm hover:border-indigo-200"
                                        >
                                            <div className="flex items-center gap-4 w-full">
                                                <div className="p-2.5 bg-gray-50 text-indigo-600 rounded-xl group-hover/row:bg-indigo-600 group-hover/row:text-white transition-colors">
                                                    <FiRefreshCw size={20} className={loadingAnalytics[outlet.storeUid] ? 'animate-spin' : ''} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-gray-800 text-base transition-colors">Scan Analytics</span>
                                                        <FiArrowRight className="text-gray-400 group-hover/row:translate-x-1 transition-all" />
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-medium mt-0.5 transition-colors">
                                                        View engagement trends
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

                        <div className="mb-10 flex flex-col sm:flex-row items-center gap-8 bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100">
                            {/* Logo Edit Section - Mirroring the Card Style */}
                            <div className="relative group/logo-edit">
                                <div 
                                    onDragOver={handleLogoDragOver}
                                    onDragLeave={handleLogoDragLeave}
                                    onDrop={handleLogoDrop}
                                    className={`w-32 h-32 rounded-[2rem] overflow-hidden bg-white shadow-xl border-4 cursor-pointer relative transition-all duration-300 ${isDraggingLogo ? 'border-blue-500 scale-[1.1] ring-8 ring-blue-50 shadow-blue-200' : 'border-white'}`}
                                    onClick={() => editLogoInputRef.current?.click()}
                                >
                                    {editLogoPreview ? (
                                        <img src={editLogoPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-600 text-3xl font-black">
                                            {editForm.storeName?.charAt(0)}
                                        </div>
                                    )}
                                    
                                    {/* Edit Overlay */}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/logo-edit:opacity-100 transition-opacity">
                                        <FiEdit2 className="text-white text-2xl" />
                                    </div>

                                    {isDraggingLogo && (
                                        <div className="absolute inset-0 bg-blue-600/60 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-in zoom-in-95 duration-200">
                                            <FiUploadCloud size={32} />
                                            <span className="text-[10px] font-black uppercase tracking-widest mt-2">Drop</span>
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={() => editLogoInputRef.current?.click()}
                                    className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-lg border-2 border-white hover:bg-blue-700 transition-all active:scale-90"
                                >
                                    <FiUploadCloud size={14} />
                                </button>
                                <input 
                                    ref={editLogoInputRef}
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setEditLogoFile(file);
                                            setEditLogoPreview(URL.createObjectURL(file));
                                        }
                                    }} 
                                />
                            </div>

                            <div className="text-center sm:text-left">
                                <h3 className="text-3xl font-black text-gray-900 tracking-tight">Edit Outlet</h3>
                                <p className="text-gray-500 font-medium text-sm mt-1">Update your store identity and profile</p>
                            </div>
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
                                    value={`${window.location.origin}/${qrModalOutlet.storeUid}/${qrModalOutlet.storeName.replace(/\s+/g, '-')}?source=qr`}
                                    size={256}
                                    level="H"
                                    includeMargin={true}
                                    className="rounded-2xl shadow-sm"
                                />
                            </div>
                            <button
                                onClick={() => downloadQRAsPDF(qrModalOutlet.storeName)}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-5 rounded-3xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                            >
                                <FiDownload size={20} /> Download QR (PDF)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {analyticsOutlet && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setAnalyticsOutlet(null)}
                            className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                        >
                            <FiX size={24} />
                        </button>

                        <div className="space-y-8">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-indigo-600 text-white rounded-[1.5rem] shadow-lg shadow-indigo-100">
                                    <FiRefreshCw size={24} className={loadingAnalytics[analyticsOutlet.storeUid] ? 'animate-spin' : ''} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">{analyticsOutlet.storeName}</h3>
                                    <p className="text-sm text-gray-500 font-medium tracking-tight">Scan Engagement (Last 7 Days)</p>
                                </div>
                            </div>

                            <div className="h-64 pt-4 bg-slate-50/50 rounded-[2.5rem] border border-gray-100 p-6 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/20 to-transparent pointer-events-none" />
                                {loadingAnalytics[analyticsOutlet.storeUid] ? (
                                    <div className="h-full flex flex-col items-center justify-center gap-3">
                                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-xs font-bold text-indigo-600 animate-pulse">Fetching trends...</span>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={analyticsData[analyticsOutlet.storeUid] || []}>
                                            <defs>
                                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                                dy={10}
                                                tickFormatter={(str) => {
                                                    const date = new Date(str);
                                                    return date.toLocaleDateString('en-US', { weekday: 'narrow' }).toUpperCase();
                                                }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                                width={25}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#1e293b',
                                                    border: 'none',
                                                    borderRadius: '16px',
                                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                                    padding: '12px 16px'
                                                }}
                                                itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: '800' }}
                                                labelStyle={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', fontWeight: '900', marginBottom: '4px' }}
                                                cursor={{ stroke: '#4f46e5', strokeWidth: 2, strokeDasharray: '5 5' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="count"
                                                stroke="#4f46e5"
                                                strokeWidth={4}
                                                fillOpacity={1}
                                                fill="url(#colorCount)"
                                                animationDuration={1500}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            <div className="flex items-center justify-between p-6 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Total Scans</span>
                                    <p className="text-3xl font-black text-indigo-700">
                                        {(analyticsData[analyticsOutlet.storeUid] || []).reduce((acc, curr) => acc + curr.count, 0)}
                                    </p>
                                </div>
                                <div className="h-12 w-px bg-indigo-100 mx-4" />
                                <div className="space-y-1 text-right">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Peak Volume</span>
                                    <p className="text-3xl font-black text-indigo-700">
                                        {Math.max(...(analyticsData[analyticsOutlet.storeUid] || [{ count: 0 }]).map(d => d.count))}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import { FiArrowRight, FiSearch } from "react-icons/fi";

interface Outlet {
    storeUid: string;
    storeName: string;
    address: string;
    city: string;
    zipCode: string;
    logoUrl?: string;
    isActive?: boolean;
}

export default function OutletBrowsing() {
    const { businessId } = useParams();
    const navigate = useNavigate();
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [businessName, setBusinessName] = useState("");
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch outlets
                const outletsRes = await api.get(`/businesses/${businessId}/outlets`);
                // Filter only active ones for public view
                setOutlets(outletsRes.data.filter((o: Outlet) => o.isActive !== false));

                // Fetch business name (optional, if we want to show it)
                const businessRes = await api.get(`/auth/me/${businessId}`);
                setBusinessName(businessRes.data.name);
            } catch (error) {
                console.error("Failed to fetch public data", error);
            } finally {
                setLoading(false);
            }
        };
        if (businessId) fetchData();
    }, [businessId]);

    const filteredOutlets = outlets.filter(o => 
        o.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.city.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-100/50 px-6 py-8 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                            {businessName || "Our Outlets"}
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium">Select a location to view our menu</p>
                    </div>
                    <div className="relative w-full md:w-96">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or city..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-2xl outline-none transition-all shadow-sm font-medium"
                        />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
                {filteredOutlets.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredOutlets.map((outlet) => (
                            <div 
                                key={outlet.storeUid} 
                                className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center text-center gap-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                                onClick={() => navigate(`/${outlet.storeUid}/${outlet.storeName.replace(/\s+/g, '-')}`)}
                            >
                                <div className="relative">
                                    {outlet.logoUrl ? (
                                        <img src={outlet.logoUrl} alt={outlet.storeName} className="w-24 h-24 rounded-3xl object-cover shadow-md bg-gray-50 border-4 border-white" />
                                    ) : (
                                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-600 text-3xl font-black shadow-md border-4 border-white">
                                            {outlet.storeName?.charAt(0)}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 w-full">
                                    <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">
                                        {outlet.storeName}
                                    </h3>
                                    <p className="text-gray-400 text-sm font-medium line-clamp-2 min-h-[40px] px-2">
                                        {outlet.address}, {outlet.city}
                                    </p>
                                    
                                    <div className="mt-8">
                                        <div
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-[1.25rem] font-bold transition-all shadow-lg hover:shadow-blue-200 active:scale-[0.98] flex items-center justify-center gap-2 group/btn"
                                        >
                                            View Menu <FiArrowRight className="group-hover/btn:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-white rounded-[3rem] border border-gray-100 shadow-sm">
                        <div className="bg-gray-50 w-20 h-20 rounded-3xl flex items-center justify-center text-gray-400 text-3xl mx-auto mb-6">
                            <FiSearch />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No outlets found</h3>
                        <p className="text-gray-500 font-medium">Try adjusting your search or check back later.</p>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="text-center py-12 text-gray-400 font-medium border-t border-gray-100 bg-white">
                Powered by Menu Management System
            </footer>
        </div>
    );
}

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import api from "../api/client";
import { FiPhone, FiMapPin, FiNavigation } from "react-icons/fi";
import { GoogleMap, useJsApiLoader, MarkerF } from "@react-google-maps/api";

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

const mapContainerStyle = {
    width: "100%",
    height: "100%",
};

const mapOptions = {
    disableDefaultUI: true,
    zoomControl: false,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    styles: [
        {
            "featureType": "all",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#747474" }, { "lightness": "4" }]
        },
        {
            "featureType": "administrative",
            "elementType": "geometry.fill",
            "stylers": [{ "color": "#fefefe" }, { "lightness": "20" }]
        },
        {
            "featureType": "landscape",
            "elementType": "geometry",
            "stylers": [{ "color": "#f5f5f5" }, { "lightness": "20" }]
        },
        {
            "featureType": "poi",
            "elementType": "geometry",
            "stylers": [{ "color": "#f5f5f5" }, { "lightness": "21" }]
        }
    ]
};

// MapUpdater removed as GoogleMap handles center updates reactively

interface Dish {
    dishId: string;
    name: string;
    price: number | null;
    weight: string | null;
    description: string | null;
    imageUrl: string | null;
}

interface Category {
    categoryName: string;
    dishes: Dish[];
}

interface OutletData {
    storeName: string;
    logoUrl: string;
    address: string;
    city: string;
    phone?: string;
    latitude?: number | null;
    longitude?: number | null;
}

export default function PublicMenu() {
    const { isLoaded } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    const { outletUid } = useParams();
    const [outlet, setOutlet] = useState<OutletData | null>(null);
    const [menu, setMenu] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [theme] = useState<"light" | "dark">("light");

    const [searchParams] = useSearchParams();
    const source = searchParams.get("source");

    useEffect(() => {
        if (outletUid) {
            fetchMenu();

            // Unique QR Scan Logic:
            // 1. Only record if source is 'qr'
            // 2. Only record if not already recorded in this session
            const sessionKey = `scan_recorded_${outletUid}`;
            const alreadyRecorded = sessionStorage.getItem(sessionKey);

            if (source === "qr" && !alreadyRecorded) {
                recordScan();
                sessionStorage.setItem(sessionKey, "true");

                // Clean the URL by removing ?source=qr
                const newUrl = window.location.pathname;
                window.history.replaceState({}, "", newUrl);
            }
        }
    }, [outletUid, source]);

    const recordScan = async () => {
        try {
            await api.post(`/outlets/${outletUid}/scan`);
            console.log("Scan recorded successfully for", outletUid);
        } catch (error) {
            console.error("Failed to record scan", error);
        }
    };

    const fetchMenu = async () => {
        try {
            const res = await api.get(`/outlets/${outletUid}/menu`);
            setOutlet(res.data.outlet);
            setMenu(res.data.menu);
        } catch (error) {
            console.error("Failed to load menu", error);
        } finally {
            setLoading(false);
        }
    };



    if (loading)
        return (
            <div className="min-h-screen flex items-center justify-center text-lg font-medium">
                Loading Menu...
            </div>
        );

    if (!outlet)
        return (
            <div className="min-h-screen flex items-center justify-center text-lg font-medium">
                Outlet not found
            </div>
        );

    const isDark = theme === "dark";

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isDark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"}`}>

            {/* HERO SECTION */}
            <div className={`relative overflow-hidden ${isDark ? "bg-gray-900" : "bg-white"} shadow-sm`}>
                <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">

                    <div className="flex items-center gap-6">
                        {outlet.logoUrl && (
                            <img
                                src={outlet.logoUrl}
                                alt={outlet.storeName}
                                className="w-20 h-20 rounded-2xl object-cover shadow-lg"
                            />
                        )}

                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                                {outlet.storeName}
                            </h1>
                            <div className="flex flex-wrap gap-4 mt-3">
                                <div className={`flex items-center gap-2 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                    <FiMapPin className="text-blue-500" />
                                    <span>{outlet.city}</span>
                                </div>
                                {outlet.phone && (
                                    <div className={`flex items-center gap-2 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                        <FiPhone className="text-blue-500" />
                                        <span>{outlet.phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>


                </div>
            </div>

            {/* MENU CONTENT */}
            <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">

                {menu.map((category) => (
                    <section key={category.categoryName}>

                        {/* Category Title */}
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                                {category.categoryName}
                            </h2>
                            <div className={`h-[2px] flex-1 ml-6 ${isDark ? "bg-gray-800" : "bg-gray-200"}`} />
                        </div>

                        {/* Dish Grid */}
                        <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-8">
                            {category.dishes.map((dish) => (
                                <div
                                    key={dish.dishId}
                                    className={`rounded-2xl p-4 sm:p-5 flex gap-4 sm:gap-5 transition-all duration-300 hover:shadow-xl ${isDark
                                        ? "bg-gray-900 border border-gray-800"
                                        : "bg-white border border-gray-100"
                                        }`}
                                >
                                    {/* Image */}
                                    <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0">
                                        {dish.imageUrl ? (
                                            <img
                                                src={dish.imageUrl}
                                                alt={dish.name}
                                                className="w-full h-full object-cover hover:scale-105 transition duration-500"
                                            />
                                        ) : (
                                            <div className={`w-full h-full flex items-center justify-center text-xs ${isDark ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-400"
                                                }`}>
                                                No Image
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-lg font-semibold">
                                                    {dish.name}
                                                </h3>

                                                {dish.price !== null && (
                                                    <span className="text-lg font-bold text-blue-600">
                                                        ₹{dish.price}
                                                    </span>
                                                )}
                                            </div>

                                            {dish.description && (
                                                <p className={`text-sm mt-2 leading-relaxed ${isDark ? "text-gray-400" : "text-gray-500"
                                                    }`}>
                                                    {dish.description}
                                                </p>
                                            )}
                                        </div>

                                        {dish.weight && (
                                            <span className={`mt-4 text-xs px-3 py-1 rounded-full w-fit ${isDark
                                                ? "bg-gray-800 text-gray-300"
                                                : "bg-gray-100 text-gray-600"
                                                }`}>
                                                {dish.weight}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}

                {/* Empty State */}
                {menu.length === 0 && (
                    <div className="text-center py-24 text-gray-400">
                        No menu items available.
                    </div>
                )}

                {/* FIND US SECTION */}
                <section className="pt-10 border-t border-gray-100/50">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                            Find Us
                        </h2>
                        <div className={`h-[2px] flex-1 ml-6 ${isDark ? "bg-gray-800" : "bg-gray-200"}`} />
                    </div>

                    <div className="grid md:grid-cols-2 gap-10 items-stretch">
                        <div className={`${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"} border shadow-sm rounded-[2rem] p-8 space-y-6`}>
                            <div className="space-y-2">
                                <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest">Location</p>
                                <p className={`text-lg font-bold leading-snug ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                                    {outlet.address}
                                </p>
                                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                    {outlet.city}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest">Contact</p>
                                <p className={`text-lg font-bold ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                                    {outlet.phone || "No phone provided"}
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    const encodedAddr = encodeURIComponent(`${outlet.address}, ${outlet.city}`);
                                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddr}`, "_blank");
                                }}
                                className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:translate-y-1"
                            >
                                <FiNavigation className="text-base" />
                                Get Directions
                            </button>
                        </div>

                        <div className="h-[300px] md:h-auto min-h-[300px] rounded-[2rem] overflow-hidden border-8 border-white shadow-xl ring-1 ring-gray-100 z-0 relative bg-gray-50">
                            {isLoaded ? (
                                <GoogleMap
                                    mapContainerStyle={mapContainerStyle}
                                    center={{ 
                                        lat: outlet.latitude || 20.5937, 
                                        lng: outlet.longitude || 78.9629 
                                    }}
                                    zoom={outlet.latitude ? 16 : 5}
                                    options={mapOptions}
                                >
                                    {outlet.latitude && outlet.longitude && (
                                        <MarkerF position={{ lat: outlet.latitude, lng: outlet.longitude }} />
                                    )}
                                </GoogleMap>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-gray-400 font-bold uppercase tracking-widest text-xs">
                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    Map Loading...
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {/* FOOTER */}
            <footer className={`text-center py-10 text-sm ${isDark ? "text-gray-500 border-t border-gray-800" : "text-gray-400 border-t border-gray-200"
                }`}>
                © {new Date().getFullYear()} {outlet.storeName}. All rights reserved.
            </footer>
        </div>
    );
}

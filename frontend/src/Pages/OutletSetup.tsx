import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../api/client";
import { FiShoppingBag, FiUploadCloud, FiMapPin, FiX, FiSearch, FiNavigation, FiCheckCircle, FiEdit3 } from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useDebounce } from "use-debounce";

import ProgressBar from "../components/ProgressBar";

// Fix leaflet icon issue in React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const countryCurrencyMap: Record<string, string> = {
    IN: "₹", US: "$", GB: "£", EU: "€", CA: "CA$", AU: "A$", JP: "¥", CN: "¥", 
    AE: "AED", SA: "SAR", SG: "S$", NZ: "NZ$",
};

const countryDialCodeMap: Record<string, string> = {
    IN: "+91", US: "+1", GB: "+44", DE: "+49", FR: "+33", IT: "+39", ES: "+34", 
    CA: "+1", AU: "+61", JP: "+81", CN: "+86", AE: "+971", SA: "+966", 
    SG: "+65", NZ: "+64",
};

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
}

function LocationPicker({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export default function OutletSetup() {
    // Mode State
    const [setupMode, setSetupMode] = useState<"map" | "manual">("map");
    const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);

    const [outletName, setOutletName] = useState(() => localStorage.getItem("outlet_setup_name") || "");
    const [address, setAddress] = useState(() => localStorage.getItem("outlet_setup_address") || "");
    const [city, setCity] = useState(() => localStorage.getItem("outlet_setup_city") || "");
    const [zipCode, setZipCode] = useState(() => localStorage.getItem("outlet_setup_zip") || "");
    const [latitude, setLatitude] = useState<number | null>(() => {
        const val = localStorage.getItem("outlet_setup_lat");
        return val ? parseFloat(val) : 20.5937;
    });
    const [longitude, setLongitude] = useState<number | null>(() => {
        const val = localStorage.getItem("outlet_setup_lng");
        return val ? parseFloat(val) : 78.9629;
    });
    const [currency, setCurrency] = useState("₹");
    const [phone, setPhone] = useState("");
    const [dialCode, setDialCode] = useState("+91");
    const [logo, setLogo] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isExistingOutlet, setIsExistingOutlet] = useState(false);
    const [isFetchingOutlet, setIsFetchingOutlet] = useState(false);
    
    // Address Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch] = useDebounce(searchQuery, 800);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const navigate = useNavigate();
    const { business, selectedOutletUid, setSelectedOutletUid } = useAuth();

    // Nominatim Reverse Geocoding
    const fetchAddressDetails = useCallback(async (lat: number, lng: number, shouldPopulateInputs: boolean = true) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            if (data && data.address) {
                const addr = data.display_name;
                const town = data.address.city || data.address.town || data.address.village || "";
                const postcode = data.address.postcode || "";
                const countryCode = data.address.country_code?.toUpperCase();

                if (shouldPopulateInputs) {
                    setAddress(addr);
                    setCity(town);
                    setZipCode(postcode.replace(/\D/g, "").slice(0, 6));
                    setIsLocationConfirmed(true);
                }
                
                if (countryCode && countryCurrencyMap[countryCode]) {
                    setCurrency(countryCurrencyMap[countryCode]);
                }
                if (countryCode && countryDialCodeMap[countryCode]) {
                    setDialCode(countryDialCodeMap[countryCode]);
                }
            }
        } catch (error) {
            console.error("Reverse geocoding failed", error);
        }
    }, []);

    // Fetch existing outlet details
    useEffect(() => {
        if (selectedOutletUid) {
            const fetchOutletDetails = async () => {
                setIsFetchingOutlet(true);
                try {
                    const res = await api.get(`/businesses/${business?.businessId}/outlets`);
                    const outlet = res.data.find((o: any) => o.storeUid === selectedOutletUid);
                    if (outlet) {
                        setOutletName(outlet.storeName || "");
                        setAddress(outlet.address || "");
                        setCity(outlet.city || "");
                        setZipCode(outlet.zipCode || "");
                        setCurrency(outlet.currency || "₹");
                        if (outlet.phone) {
                            const match = outlet.phone.match(/^(\+\d+)\s*(.*)$/);
                            if (match) {
                                setDialCode(match[1]);
                                setPhone(match[2]);
                            } else {
                                setPhone(outlet.phone);
                            }
                        }
                        if (outlet.latitude && outlet.longitude) {
                            setLatitude(outlet.latitude);
                            setLongitude(outlet.longitude);
                            setIsLocationConfirmed(true);
                        }
                        if (outlet.logoUrl) {
                            setPreview(outlet.logoUrl);
                        }
                        setIsExistingOutlet(true);
                    }
                } catch (error) {
                    console.error("Failed to fetch outlet details", error);
                } finally {
                    setIsFetchingOutlet(false);
                }
            };
            fetchOutletDetails();
        }
    }, [selectedOutletUid, business]);

    // Detect Current Location on Mount
    useEffect(() => {
        // We allow re-detection even if we have stored lat/lng if the lat/lng match the defaults (initial mount)
        // or if explicitly requested. For simplicity, we run it if no outlet is selected.
        if (!selectedOutletUid && !isExistingOutlet && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setLatitude(latitude);
                    setLongitude(longitude);
                    // Pass false to specifically avoid auto-setting inputs like address/city on mount
                    fetchAddressDetails(latitude, longitude, false);
                    toast.success("Location detected! Tap map to pick address. 📍");
                },
                (err) => {
                    console.warn("Geolocation permission denied or failed", err);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        }
    }, [selectedOutletUid, isExistingOutlet, fetchAddressDetails]);

    // Persist to localStorage
    useEffect(() => {
        if (!isExistingOutlet && !isFetchingOutlet && !selectedOutletUid) {
            localStorage.setItem("outlet_setup_name", outletName);
            localStorage.setItem("outlet_setup_address", address);
            localStorage.setItem("outlet_setup_city", city);
            localStorage.setItem("outlet_setup_zip", zipCode);
            if (latitude) localStorage.setItem("outlet_setup_lat", latitude.toString());
            if (longitude) localStorage.setItem("outlet_setup_lng", longitude.toString());
        }
    }, [outletName, address, city, zipCode, latitude, longitude, isExistingOutlet, isFetchingOutlet, selectedOutletUid]);

    // Nominatim Forward Geocoding (Suggestions)
    useEffect(() => {
        if (debouncedSearch && debouncedSearch.length > 3) {
            const search = async () => {
                setIsSearching(true);
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(debouncedSearch)}`);
                    const data = await res.json();
                    setSuggestions(data.slice(0, 5));
                } catch (error) {
                    console.error("Geocoding search failed", error);
                } finally {
                    setIsSearching(false);
                }
            };
            search();
        } else {
            setSuggestions([]);
        }
    }, [debouncedSearch]);

    const handleSuggestionSelect = (suggestion: any) => {
        const lat = parseFloat(suggestion.lat);
        const lng = parseFloat(suggestion.lon);
        setLatitude(lat);
        setLongitude(lng);
        setSearchQuery(suggestion.display_name);
        setSuggestions([]);
        fetchAddressDetails(lat, lng);
    };

    const handleLocationSelect = (lat: number, lng: number) => {
        setLatitude(lat);
        setLongitude(lng);
        fetchAddressDetails(lat, lng);
    };

    const isFormValid = !!(outletName && address && city && zipCode.length >= 5);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;
        
        setLoading(true);

        const formData = new FormData();
        formData.append("storeName", outletName);
        formData.append("address", address);
        formData.append("city", city);
        formData.append("zipCode", zipCode);
        formData.append("currency", currency);
        if (latitude) formData.append("latitude", latitude.toString());
        if (longitude) formData.append("longitude", longitude.toString());
        if (phone) formData.append("phone", `${dialCode} ${phone}`);
        if (logo) {
            formData.append("logo", logo);
        }

        try {
            if (isExistingOutlet && selectedOutletUid) {
                const reqRes = await api.post(`/outlets/${selectedOutletUid}/requests`);
                localStorage.setItem("requestId", reqRes.data.requestId);
                toast.success("Continuing with your outlet! 🚀");
            } else {
                const res = await api.post(`/businesses/${business?.businessId}/outlets`, formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                const outletUid = res.data.storeUid;
                setSelectedOutletUid(outletUid);
                
                const reqRes = await api.post(`/outlets/${outletUid}/requests`);
                localStorage.setItem("requestId", reqRes.data.requestId);

                // Clear persistence
                localStorage.removeItem("outlet_setup_name");
                localStorage.removeItem("outlet_setup_address");
                localStorage.removeItem("outlet_setup_city");
                localStorage.removeItem("outlet_setup_zip");
                localStorage.removeItem("outlet_setup_lat");
                localStorage.removeItem("outlet_setup_lng");
                
                toast.success("Outlet created! Let's upload your menu. 🚀");
            }
            
            setTimeout(() => navigate("/menu-upload"), 800);
        } catch (error: any) {
            console.error(error);
            toast.error(error?.response?.data?.detail || "Process failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-76px)] bg-white flex flex-col items-center p-4 md:p-8 relative animate-in fade-in duration-700">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none fixed z-0">
                <div className="absolute top-[-5%] right-[-5%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px]"></div>
                <div className="absolute bottom-[-5%] left-[-5%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px]"></div>
            </div>

            <div className="w-full max-w-2xl z-10 flex flex-col gap-8 md:gap-10">
                <ProgressBar currentStep={1} outletName={outletName} />
                
                <div className="text-center space-y-3">
                    <h2 className="text-4xl md:text-5xl font-[1000] text-gray-900 tracking-tighter leading-none">Settings up your outlet</h2>
                    <p className="text-gray-400 text-sm md:text-lg font-medium">Just a few details to get your digital menu ready.</p>
                </div>

                {/* Vertical Mode Toggle - Premium pill style */}
                <div className="flex bg-gray-100/80 p-1.5 rounded-[2.5rem] w-fit mx-auto shadow-sm border border-gray-100/50 backdrop-blur-sm">
                    <button
                        onClick={() => setSetupMode("map")}
                        className={`px-10 py-3.5 rounded-[2rem] font-black text-xs uppercase tracking-[0.15em] transition-all flex items-center gap-2 ${setupMode === "map" ? "bg-white text-blue-600 shadow-md scale-[1.02]" : "text-gray-400 hover:text-gray-600"}`}
                    >
                        <FiMapPin className="text-sm" />
                        Use Map Search
                    </button>
                    <button
                        onClick={() => setSetupMode("manual")}
                        className={`px-10 py-3.5 rounded-[2rem] font-black text-xs uppercase tracking-[0.15em] transition-all flex items-center gap-2 ${setupMode === "manual" ? "bg-white text-blue-600 shadow-md scale-[1.02]" : "text-gray-400 hover:text-gray-600"}`}
                    >
                        <FiEdit3 className="text-sm" />
                        Manual Entry
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-10 pb-20">
                    {/* Section 1: Business Identity */}
                    <div className="space-y-6">
                        <div className="relative group">
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.25em] mb-3 ml-2">
                                Outlet Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute left-7 top-1/2 -translate-y-1/2 bg-white/80 p-2.5 rounded-2xl shadow-sm border border-gray-50 group-focus-within:border-blue-200 transition-all">
                                    <FiShoppingBag className="text-gray-400 group-focus-within:text-blue-500 transition-all text-xl" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="e.g. The Italian Bistro"
                                    required
                                    value={outletName}
                                    className="w-full pl-20 pr-8 py-6 bg-gray-50/50 border-2 border-transparent rounded-[2.5rem] focus:bg-white focus:border-blue-500 focus:ring-[12px] focus:ring-blue-100/50 outline-none transition-all font-bold text-xl placeholder:text-gray-300 shadow-sm"
                                    onChange={(e) => setOutletName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="relative group">
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.25em] mb-3 ml-2">
                                Phone Number <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-4">
                                <div className="w-[100px] shrink-0">
                                    <input
                                        type="text"
                                        readOnly
                                        value={dialCode}
                                        className="w-full px-4 py-6 bg-gray-50/50 border-2 border-transparent rounded-[2.5rem] text-center font-bold text-xl text-gray-500"
                                    />
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="tel"
                                        placeholder="Phone Number"
                                        required
                                        value={phone}
                                        className="w-full px-8 py-6 bg-gray-50/50 border-2 border-transparent rounded-[2.5rem] focus:bg-white focus:border-blue-500 focus:ring-[12px] focus:ring-blue-100/50 outline-none transition-all font-bold text-xl placeholder:text-gray-300 shadow-sm"
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="relative group">
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.25em] mb-3 ml-2">
                                Outlet Logo <span className="text-gray-400/60 font-medium lowercase">(optional)</span>
                            </label>
                            <div className="flex items-center gap-4">
                                <label className="flex-1 flex items-center gap-6 p-6 bg-gray-50/30 border-2 border-dashed border-gray-100 rounded-[2.5rem] cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition-all overflow-hidden group/logo">
                                    <div className="w-24 h-24 rounded-[1.5rem] bg-white border-2 border-white shadow-xl flex items-center justify-center overflow-hidden shrink-0 ring-4 ring-gray-50/50">
                                        {preview ? (
                                            <img src={preview} alt="Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <FiUploadCloud className="text-3xl text-blue-500" />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xl font-black text-gray-800 tracking-tight">{preview ? 'Logo updated' : 'Upload outlet logo'}</span>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">JPG, PNG or SVG</span>
                                    </div>
                                    <input 
                                        ref={fileInputRef}
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setLogo(file);
                                                setPreview(URL.createObjectURL(file));
                                            }
                                        }} 
                                    />
                                </label>
                                {preview && (
                                    <button 
                                        type="button" 
                                        onClick={() => { 
                                            setPreview(null); 
                                            setLogo(null); 
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                        }}
                                        className="h-20 w-14 bg-red-50 text-red-500 rounded-[1.5rem] flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100"
                                    >
                                        <FiX className="text-xl" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Location Data */}
                    <div className="space-y-6 pt-2 border-t border-gray-100/50">
                        {setupMode === "map" ? (
                            <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-700">
                                <div className="relative z-50">
                                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.25em] mb-3 ml-2">
                                        Select Location <span className="text-red-500">*</span>
                                    </label>
                                    {!isLocationConfirmed ? (
                                    <div className="relative group/search">
                                        <div className="absolute left-7 top-1/2 -translate-y-1/2 bg-white/80 p-2.5 rounded-2xl shadow-sm border border-gray-50 group-focus-within/search:border-blue-200 transition-all">
                                            <FiSearch className="text-gray-400 group-focus-within/search:text-blue-500 transition-all text-xl" />
                                        </div>
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            placeholder="Search locality, street or landmark..."
                                            value={searchQuery}
                                            className="w-full pl-20 pr-8 py-6 bg-gray-50/50 border-2 border-transparent rounded-[2.5rem] focus:bg-white focus:border-blue-500 focus:ring-[12px] focus:ring-blue-100/50 outline-none transition-all font-bold text-xl placeholder:text-gray-300 shadow-sm"
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                        {isSearching && (
                                            <div className="absolute right-7 top-1/2 -translate-y-1/2">
                                                <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-blue-50/60 backdrop-blur-sm border-2 border-blue-100 p-8 rounded-[2.5rem] flex items-center gap-6 animate-in slide-in-from-top-4 duration-500">
                                        <div className="bg-blue-600 p-4 rounded-2xl shadow-xl shadow-blue-200">
                                            <FiCheckCircle className="text-white text-2xl" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] leading-none mb-2">Location Ready</p>
                                            <p className="text-blue-900 font-black text-lg leading-tight tracking-tight line-clamp-2">{address}</p>
                                            <div className="flex gap-4 mt-2">
                                                <span className="text-xs font-bold text-blue-400/80 bg-blue-100/50 px-3 py-1 rounded-full">{city}</span>
                                                <span className="text-xs font-bold text-blue-400/80 bg-blue-100/50 px-3 py-1 rounded-full">{zipCode}</span>
                                            </div>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setIsLocationConfirmed(false);
                                                setSearchQuery(address);
                                            }}
                                            className="p-4 bg-white text-blue-600 hover:bg-blue-600 hover:text-white rounded-2xl transition-all shadow-sm border border-blue-100 shrink-0"
                                            title="Change location"
                                        >
                                            <FiEdit3 className="text-xl" />
                                        </button>
                                    </div>
                                )}
                                
                                {/* Suggestions Dropdown */}
                                {suggestions.length > 0 && !isLocationConfirmed && (
                                    <div className="absolute top-full left-0 right-0 mt-4 bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-gray-100/50 overflow-hidden z-[5000] animate-in fade-in zoom-in-95 duration-200">
                                        {suggestions.map((s, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleSuggestionSelect(s)}
                                                className="w-full text-left px-8 py-5 hover:bg-blue-50 transition-all border-b border-gray-50 last:border-0 group select-none"
                                            >
                                                <div className="flex items-start gap-5">
                                                    <div className="p-2.5 rounded-xl bg-gray-50 group-hover:bg-white transition-colors group-hover:shadow-sm">
                                                        <FiNavigation className="text-gray-400 group-hover:text-blue-500" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-gray-800 line-clamp-1">{s.display_name.split(',')[0]}</span>
                                                        <span className="text-xs font-bold text-gray-400 line-clamp-1">{s.display_name.split(',').slice(1).join(',')}</span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {!isLocationConfirmed && (
                                <div className="h-[400px] w-full rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl z-10 relative ring-1 ring-gray-100/50 animate-in zoom-in duration-500">
                                    <MapContainer 
                                        center={[latitude || 20.5937, longitude || 78.9629]} 
                                        zoom={latitude ? 16 : 5} 
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                        />
                                        {latitude && longitude && (
                                            <>
                                                <Marker position={[latitude, longitude]} />
                                                <MapUpdater center={[latitude, longitude]} />
                                            </>
                                        )}
                                        <LocationPicker onLocationSelect={handleLocationSelect} />
                                    </MapContainer>

                                    {/* Locate Me Button Overlay */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (navigator.geolocation) {
                                                navigator.geolocation.getCurrentPosition(
                                                    (pos) => {
                                                        const { latitude, longitude } = pos.coords;
                                                        setLatitude(latitude);
                                                        setLongitude(longitude);
                                                        // Pass false to specifically avoid auto-setting inputs like address/city
                                                        fetchAddressDetails(latitude, longitude, false);
                                                        toast.success("Syncing map with your location! 📍");
                                                    },
                                                    (err) => toast.error("Could not access location. Please check browser permissions."),
                                                    { enableHighAccuracy: true }
                                                );
                                            }
                                        }}
                                        className="absolute bottom-6 right-6 z-[1000] bg-white text-blue-600 p-4 rounded-2xl shadow-xl border border-blue-50 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest"
                                    >
                                        <FiNavigation className="text-lg" />
                                        Locate Me
                                    </button>
                                </div>
                            )}
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in slide-in-from-right-12 duration-700">
                                <div className="relative group">
                                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.25em] mb-3 ml-2">
                                        Street Address <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-7 top-7 bg-white/80 p-2.5 rounded-2xl shadow-sm border border-gray-50 group-focus-within:border-blue-200 transition-all">
                                            <FiMapPin className="text-gray-400 group-focus-within:text-blue-500 transition-all text-xl" />
                                        </div>
                                        <textarea
                                            placeholder="Flat/House No, Building, Street Name"
                                            required
                                            rows={4}
                                            value={address}
                                            className="w-full pl-20 pr-8 py-7 bg-gray-50/50 border-2 border-transparent rounded-[2.5rem] focus:bg-white focus:border-blue-500 focus:ring-[12px] focus:ring-blue-100/50 outline-none transition-all font-bold text-xl placeholder:text-gray-300 shadow-sm resize-none"
                                            onChange={(e) => setAddress(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="relative group">
                                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.25em] mb-3 ml-2">
                                            City <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="City Name"
                                            required
                                            value={city}
                                            className="w-full px-8 py-6 bg-gray-50/50 border-2 border-transparent rounded-[2.5rem] focus:bg-white focus:border-blue-500 focus:ring-[12px] focus:ring-blue-100/50 outline-none transition-all font-bold text-xl placeholder:text-gray-300 shadow-sm"
                                            onChange={(e) => setCity(e.target.value)}
                                        />
                                    </div>
                                    <div className="relative group">
                                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.25em] mb-3 ml-2">
                                            Zip Code <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Pincode / Zip"
                                            required
                                            value={zipCode}
                                            className="w-full px-8 py-6 bg-gray-50/50 border-2 border-transparent rounded-[2.5rem] focus:bg-white focus:border-blue-500 focus:ring-[12px] focus:ring-blue-100/50 outline-none transition-all font-bold text-xl placeholder:text-gray-300 shadow-sm"
                                            onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ""))}
                                        />
                                    </div>
                                </div>
                                
                                <button 
                                    type="button" 
                                    onClick={() => setSetupMode("map")}
                                    className="flex items-center gap-2 text-blue-500 font-black text-xs uppercase tracking-widest hover:text-blue-700 transition-colors mx-auto"
                                >
                                    <FiNavigation className="text-sm" />
                                    Prefer using map search?
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="pt-10 flex flex-col items-center">
                        <button
                            type="submit"
                            disabled={loading || !isFormValid}
                            className={`group relative overflow-hidden px-14 py-7 rounded-[3rem] font-black text-xl uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/30 active:translate-y-1 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed w-full max-w-md ${loading ? 'bg-gray-400' : 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white hover:shadow-blue-300/60'}`}
                        >
                            <div className="relative flex items-center justify-center gap-4">
                                {loading ? (
                                    <div className="flex items-center gap-4">
                                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>INITIALIZING...</span>
                                    </div>
                                ) : (
                                    <>
                                        <span>{isExistingOutlet ? "CONTINUE JOURNEY" : "CREATE OUTLET"}</span>
                                    </>
                                )}
                            </div>
                        </button>
                        <p className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Step 1 of 4 • Account setup</p>
                    </div>
                </form>
            </div>
        </div>
    );
}

import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../api/client";
import { FiShoppingBag, FiUploadCloud, FiMapPin, FiX, FiSearch, FiNavigation, FiCheckCircle, FiEdit3 } from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GoogleMap, useJsApiLoader, MarkerF, Autocomplete } from "@react-google-maps/api";

import ProgressBar from "../components/ProgressBar";

// Google Maps Libraries
const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

const mapContainerStyle = {
    width: "100%",
    height: "100%",
};

const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
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
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry.fill",
            "stylers": [{ "color": "#ffffff" }, { "lightness": "17" }]
        }
    ]
};

const countryCurrencyMap: Record<string, string> = {
    IN: "₹", US: "$", GB: "£", EU: "€", CA: "CA$", AU: "A$", JP: "¥", CN: "¥", 
    AE: "AED", SA: "SAR", SG: "S$", NZ: "NZ$",
};

const countryDialCodeMap: Record<string, string> = {
    IN: "+91", US: "+1", GB: "+44", DE: "+49", FR: "+33", IT: "+39", ES: "+34", 
    CA: "+1", AU: "+61", JP: "+81", CN: "+86", AE: "+971", SA: "+966", 
    SG: "+65", NZ: "+64",
};

// Fix Google Autocomplete Dropdown Z-Index
const pacStyles = `
  .pac-container {
    z-index: 10000 !important;
    border-radius: 1.5rem;
    margin-top: 5px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
    border: 1px solid rgba(0,0,0,0.05);
    font-family: inherit;
  }
  .pac-item {
    padding: 12px 20px;
    cursor: pointer;
  }
  .pac-item:hover {
    background-color: #f8fafc;
  }
  .pac-item-query {
    font-size: 14px;
    font-weight: 700;
    color: #1e293b;
  }
`;

// Replaced Leaflet MapUpdater/LocationPicker with Google Map native events

export default function OutletSetup() {
    const { isLoaded } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    // Mode State
    const [setupMode, setSetupMode] = useState<"map" | "manual">("map");
    const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

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
    const [isDraggingLogo, setIsDraggingLogo] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const navigate = useNavigate();
    const { business, selectedOutletUid, setSelectedOutletUid } = useAuth();

    // Google Geocoding (Reverse)
    const fetchAddressDetails = useCallback(async (lat: number, lng: number, shouldPopulateInputs: boolean = true) => {
        if (!window.google) return;
        const geocoder = new google.maps.Geocoder();
        
        try {
            const response = await geocoder.geocode({ location: { lat, lng } });
            if (response.results && response.results[0]) {
                const result = response.results[0];
                const addr = result.formatted_address;
                
                let town = "";
                let postcode = "";
                let countryCode = "";

                result.address_components.forEach(comp => {
                    // Broader city detection: locality -> sublocality -> admin_area_2
                    if (comp.types.includes("locality")) town = comp.long_name;
                    else if (!town && comp.types.includes("sublocality_level_1")) town = comp.long_name;
                    else if (!town && comp.types.includes("administrative_area_level_2")) town = comp.long_name;
                    
                    if (comp.types.includes("postal_code")) postcode = comp.long_name;
                    if (comp.types.includes("country")) countryCode = comp.short_name;
                });

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
            console.error("Geocoding failed", error);
        }
    }, []);

    // Fetch existing outlet details
    useEffect(() => {
        if (selectedOutletUid) {
            const fetchOutletDetails = async () => {
                setIsFetchingOutlet(true);
                try {
                    const res = await api.get(`/businesses/${business?.businessId}/outlets`);
                    const outlet = res.data.outlets.find((o: any) => o.storeUid === selectedOutletUid);
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
                            fetchAddressDetails(outlet.latitude, outlet.longitude, false);
                            setIsLocationConfirmed(true);
                        }
                        if (outlet.logoUrl) {
                            setPreview(outlet.logoUrl);
                        }
                        setIsExistingOutlet(true);
                    }
                } catch (error) {
                    console.error("Failed to fetch outlet details", error);
                    toast.error("Failed to load store details");
                } finally {
                    setIsFetchingOutlet(false);
                }
            };
            fetchOutletDetails();
        } else {
            // Explicitly reset for new creation
            setOutletName("");
            setAddress("");
            setCity("");
            setZipCode("");
            setLatitude(20.5937);
            setLongitude(78.9629);
            setPreview(null);
            setLogo(null);
            setPhone("");
            setIsLocationConfirmed(false);
            setSearchQuery("");
        }
    }, [selectedOutletUid, business, fetchAddressDetails]);

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
                () => {
                    toast.error("Location permission denied. Map centered on default. 📍");
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

    // Google Places Autocomplete logic is handled via the <Autocomplete> component
    const onPlaceChanged = () => {
        if (autocompleteRef.current !== null) {
            const place = autocompleteRef.current.getPlace();
            if (place.geometry && place.geometry.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                setLatitude(lat);
                setLongitude(lng);
                
                // Extract address components directly from the place object
                let town = "";
                let postcode = "";
                let countryCode = "";

                if (place.address_components) {
                    place.address_components.forEach(comp => {
                        if (comp.types.includes("locality")) town = comp.long_name;
                        else if (!town && comp.types.includes("sublocality_level_1")) town = comp.long_name;
                        else if (!town && comp.types.includes("administrative_area_level_2")) town = comp.long_name;
                        
                        if (comp.types.includes("postal_code")) postcode = comp.long_name;
                        if (comp.types.includes("country")) countryCode = comp.short_name;
                    });
                }

                setAddress(place.formatted_address || "");
                setCity(town);
                setZipCode(postcode.replace(/\D/g, "").slice(0, 6));
                setIsLocationConfirmed(true);

                if (countryCode && countryCurrencyMap[countryCode]) {
                    setCurrency(countryCurrencyMap[countryCode]);
                }
                if (countryCode && countryDialCodeMap[countryCode]) {
                    setDialCode(countryDialCodeMap[countryCode]);
                }

                if (map) map.panTo({ lat, lng });
            }
        }
    };

    // Drag & Drop Handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingLogo(true);
    };

    const handleDragLeave = () => {
        setIsDraggingLogo(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingLogo(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
            setLogo(file);
            setPreview(URL.createObjectURL(file));
            toast.success("Logo dropped! 🖼️");
        } else if (file) {
            toast.error("Please drop an image file.");
        }
    };

    const isPhoneValid = phone.length === 10;
    const isZipValid = zipCode.length >= 5 && zipCode.length <= 6;
    const isFormValid = !!(outletName && address && city && isZipValid && isPhoneValid);

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
            <style>{pacStyles}</style>
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
                                <div className="flex-1 relative">
                                    <input
                                        type="tel"
                                        placeholder="10-digit mobile number"
                                        required
                                        maxLength={10}
                                        value={phone}
                                        className="w-full px-8 py-6 bg-gray-50/50 border-2 border-transparent rounded-[2.5rem] focus:bg-white focus:border-blue-500 focus:ring-[12px] focus:ring-blue-100/50 outline-none transition-all font-bold text-xl placeholder:text-gray-300 shadow-sm"
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="relative group">
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.25em] mb-3 ml-2">
                                Outlet Logo <span className="text-gray-400/60 font-medium lowercase">(optional)</span>
                            </label>
                            <div className="flex items-center gap-4">
                                <div 
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`flex-1 flex items-center gap-6 p-6 border-2 border-dashed rounded-[2.5rem] transition-all overflow-hidden group/logo ${isDraggingLogo ? 'border-blue-500 bg-blue-50/50 scale-[1.02] shadow-2xl shadow-blue-100 ring-4 ring-blue-50' : 'bg-gray-50/30 border-gray-100 hover:border-blue-400 hover:bg-blue-50/20 shadow-sm'}`}
                                >
                                        <div className="relative shrink-0 group/logo-preview">
                                            <div className="w-24 h-24 rounded-[1.5rem] bg-white border-2 border-white shadow-xl flex items-center justify-center overflow-hidden ring-4 ring-gray-50/50">
                                                {preview ? (
                                                    <img src={preview} alt="Logo" className="w-full h-full object-cover" />
                                                ) : (
                                                    <FiUploadCloud className={`text-3xl transition-all duration-300 ${isDraggingLogo ? 'text-blue-600 scale-125' : 'text-blue-500'}`} />
                                                )}
                                            </div>
                                            {preview && (
                                                <button 
                                                    type="button" 
                                                    onClick={(e) => { 
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setPreview(null); 
                                                        setLogo(null); 
                                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                                    }}
                                                    className="absolute -top-3 -right-3 h-8 w-8 bg-red-400 text-white rounded-full flex items-center justify-center opacity-0 group-hover/logo-preview:opacity-100 hover:bg-red-600 hover:scale-110 transition-all shadow-lg border-2 border-white z-10 group/close"
                                                >
                                                    <FiX size={14} className="group-hover/close:rotate-90 transition-transform" />
                                                </button>
                                            )}
                                        </div>
                                    <label className="flex-1 flex flex-col cursor-pointer">
                                        <span className={`text-xl font-black tracking-tight transition-colors ${isDraggingLogo ? 'text-blue-600' : 'text-gray-800'}`}>
                                            {isDraggingLogo ? 'Drop Logo Here' : (preview ? 'Logo updated' : 'Upload outlet logo')}
                                        </span>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">JPG, PNG or SVG</span>
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
                                </div>
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
                                        <div className="absolute left-7 top-1/2 -translate-y-1/2 bg-white/80 p-2.5 rounded-2xl shadow-sm border border-gray-50 group-focus-within/search:border-blue-200 transition-all z-10">
                                            <FiSearch className="text-gray-400 group-focus-within/search:text-blue-500 transition-all text-xl" />
                                        </div>
                                        {isLoaded ? (
                                            <Autocomplete
                                                onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
                                                onPlaceChanged={onPlaceChanged}
                                            >
                                                <input
                                                    ref={searchInputRef}
                                                    type="text"
                                                    placeholder="Search locality, street or landmark via Google..."
                                                    value={searchQuery}
                                                    className="w-full pl-20 pr-8 py-6 bg-gray-50/50 border-2 border-transparent rounded-[2.5rem] focus:bg-white focus:border-blue-500 focus:ring-[12px] focus:ring-blue-100/50 outline-none transition-all font-bold text-xl placeholder:text-gray-300 shadow-sm"
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            </Autocomplete>
                                        ) : (
                                            <input
                                                disabled
                                                placeholder="Loading Google Maps..."
                                                className="w-full pl-20 pr-8 py-6 bg-gray-50/50 border-2 border-transparent rounded-[2.5rem] outline-none transition-all font-bold text-xl placeholder:text-gray-300 shadow-sm"
                                            />
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
                                
                                {/* Suggestions Dropdown removed as Google Autocomplete handles this natively */}
                            </div>

                            {!isLocationConfirmed && (
                                <div className="h-[400px] w-full rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl z-10 relative ring-1 ring-gray-100/50 animate-in zoom-in duration-500 bg-gray-50">
                                    {isLoaded ? (
                                        <GoogleMap
                                            mapContainerStyle={mapContainerStyle}
                                            center={{ lat: latitude || 20.5937, lng: longitude || 78.9629 }}
                                            zoom={latitude ? 16 : 5}
                                            onLoad={(map) => setMap(map)}
                                            options={mapOptions}
                                            onClick={(e) => {
                                                if (e.latLng) {
                                                    const lat = e.latLng.lat();
                                                    const lng = e.latLng.lng();
                                                    setLatitude(lat);
                                                    setLongitude(lng);
                                                    fetchAddressDetails(lat, lng);
                                                }
                                            }}
                                        >
                                            {latitude && longitude && (
                                                <MarkerF position={{ lat: latitude, lng: longitude }} />
                                            )}
                                        </GoogleMap>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-gray-400 font-bold uppercase tracking-widest text-xs">
                                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                            Initializing Google Maps...
                                        </div>
                                    )}
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
                                            placeholder="6-digit Pincode"
                                            required
                                            maxLength={6}
                                            value={zipCode}
                                            className={`w-full px-8 py-6 bg-gray-50/50 border-2 rounded-[2.5rem] focus:bg-white focus:ring-[12px] outline-none transition-all font-bold text-xl placeholder:text-gray-300 shadow-sm
                                                ${zipCode && !isZipValid ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-transparent focus:border-blue-500 focus:ring-blue-100/50'}`}
                                            onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
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

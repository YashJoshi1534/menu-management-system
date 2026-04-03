import React, { useState, useEffect } from "react";
import api from "../api/client";
import { FiMail, FiUser, FiTag, FiPhone, FiChevronDown, FiUploadCloud, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [businessType, setBusinessType] = useState("");
    const [businessTypes, setBusinessTypes] = useState<string[]>([]);
    const [phone, setPhone] = useState("");
    const [logoData, setLogoData] = useState<string | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<"email" | "details">("email");
    const [isNewAccount, setIsNewAccount] = useState<boolean | null>(null);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const expired = localStorage.getItem("session_expired");
        if (expired === "true") {
            setShowSessionModal(true);
            localStorage.removeItem("session_expired");
        }
    }, []);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const adminRes = await api.get("/admin/business-types");
                setBusinessTypes(adminRes.data || []);
            } catch (error) {
                console.error("Failed to fetch business types", error);
                setBusinessTypes(["Restaurant", "Cafe", "Bar", "Hotel", "Other"]);
            }
        };
        fetchConfig();
    }, []);

    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isPhoneValid = /^[0-9]{10}$/.test(phone.trim());
    const isFormValid =
        step === "email" ? isEmailValid :
            name.trim().length > 0 && businessType.length > 0 && isPhoneValid;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoData(reader.result as string);
                setLogoPreview(URL.createObjectURL(file));
            };
            reader.readAsDataURL(file);
        }
    };

    const removeLogo = () => {
        setLogoData(null);
        if (logoPreview) URL.revokeObjectURL(logoPreview);
        setLogoPreview(null);
    };

    const handleContinue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;

        if (step === "email") {
            setLoading(true);
            try {
                const res = await api.post("/auth/check-email", { email });
                if (res.data.exists) {
                    // Existing user — send OTP and navigate to OTP page
                    await api.post("/auth/send-otp", { email });
                    toast.success("OTP sent! 📧");
                    navigate("/verify-otp", {
                        state: {
                            email,
                            name: res.data.business.name,
                            isNewAccount: false,
                        }
                    });
                } else {
                    // New user — show details step
                    setIsNewAccount(true);
                    setStep("details");
                }
            } catch (error: any) {
                toast.error(error?.response?.data?.detail || "An error occurred");
            } finally {
                setLoading(false);
            }
        } else if (step === "details") {
            // New user filled details — send OTP and navigate to OTP page
            setLoading(true);
            try {
                await api.post("/auth/send-otp", { email, name });
                toast.success("OTP sent! 📧");
                navigate("/verify-otp", {
                    state: {
                        email,
                        name,
                        businessType,
                        phone: `+91${phone}`,
                        logoData,
                        isNewAccount: true,
                    }
                });
            } catch (error: any) {
                toast.error(error?.response?.data?.detail || "An error occurred");
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex justify-center items-center px-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-3xl"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/10 blur-3xl"></div>
            </div>

            <div className="bg-white/80 backdrop-blur-md w-full max-w-md rounded-3xl shadow-xl p-10 z-10 border border-white relative">

                <div className="text-center mb-8 pt-4">
                    <div className="bg-blue-600 text-white w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-6 shadow-lg shadow-blue-600/30">
                        <span className="text-2xl font-black leading-none select-none">S</span>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Sign In or Create Your Account
                    </h2>
                    <p className="text-gray-500 mt-2 text-sm font-medium">
                        Enter your business email to continue
                    </p>
                </div>

                <form onSubmit={handleContinue} className="space-y-6">
                    <div className="space-y-4">
                        {/* Email — always visible */}
                        <div className="relative group animate-in fade-in duration-300">
                            <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="email"
                                placeholder="Business Email"
                                required
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (step !== "email") {
                                        setStep("email");
                                        setIsNewAccount(null);
                                    }
                                }}
                                className={`w-full pl-12 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium ${step !== "email" ? "opacity-60" : ""}`}
                            />
                        </div>

                        {/* Business Details — only for new accounts */}
                        {step === "details" && isNewAccount && (
                            <div className="space-y-4 animate-in fade-in duration-300 slide-in-from-top-4">
                                <div className="relative group">
                                    <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Business Name"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        autoFocus
                                        className="w-full pl-12 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                    />
                                </div>

                                <div className="relative group">
                                    <FiTag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10" />
                                    <select
                                        required
                                        value={businessType}
                                        onChange={(e) => setBusinessType(e.target.value)}
                                        className="w-full pl-12 pr-10 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium appearance-none cursor-pointer hover:bg-white"
                                    >
                                        <option value="" disabled>Select business type</option>
                                        {businessTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
                                </div>

                                <div className="relative group">
                                    <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10" />
                                    <div className="flex items-center">
                                        <div className="pl-12 pr-2 py-4 bg-gray-50 border border-gray-200 border-r-0 rounded-l-2xl font-black text-blue-600 text-sm">
                                            +91
                                        </div>
                                        <input
                                            type="tel"
                                            placeholder="Phone Number (10 digits)"
                                            required
                                            maxLength={10}
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                                            className="flex-1 p-4 bg-gray-50 border border-gray-200 border-l-0 rounded-r-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="relative group flex flex-col gap-2">
                                    <label className="text-sm font-medium text-gray-700 ml-1 mt-2">Business Logo <span className="text-gray-400 font-normal">(Optional)</span></label>
                                    <div className="flex items-center gap-4">
                                        <label className="flex-1 border-2 border-dashed border-gray-200 bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all text-gray-500 hover:text-blue-600">
                                            <FiUploadCloud className="text-2xl mb-1" />
                                            <span className="text-sm font-bold">Upload Logo</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                        </label>
                                        {logoPreview && (
                                            <div className="relative w-20 h-20 rounded-xl overflow-hidden shadow-sm border border-gray-200 shrink-0 group/logo">
                                                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                                <button type="button" onClick={removeLogo} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover/logo:opacity-100 transition-opacity hover:bg-red-500">
                                                    <FiX className="text-xs" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !isFormValid}
                        className={`w-full p-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 active:scale-95 ${loading || !isFormValid
                            ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
                            }`}
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                <span>Please wait...</span>
                            </>
                        ) : "Continue →"}
                    </button>
                </form>

                {step === "email" && (
                    <p className="mt-6 text-center text-sm font-medium text-gray-600">
                        We'll send a verification code to your email.
                    </p>
                )}

                <p className="mt-8 text-center text-xs font-medium text-gray-400">
                    By continuing, you agree to our <a href="/terms" className="text-blue-500 hover:underline">Terms of Service</a> & <a href="/privacy" className="text-blue-500 hover:underline">Privacy</a>.
                </p>
            </div>

            {/* Session Expired Modal */}
            {showSessionModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-300 border-t-8 border-amber-500">
                        <div className="text-center space-y-6">
                            <div className="w-20 h-20 bg-amber-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                <FiTag className="text-4xl text-amber-500" />
                            </div>
                            <h3 className="text-3xl font-[1000] text-gray-900 tracking-tighter leading-none">Session Expired</h3>
                            <p className="text-gray-500 font-medium font-bold">Your session has timed out for security. Please login again to continue.</p>
                            <button
                                onClick={() => setShowSessionModal(false)}
                                className="w-full bg-gray-900 hover:bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-xl shadow-gray-200"
                            >
                                GOT IT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

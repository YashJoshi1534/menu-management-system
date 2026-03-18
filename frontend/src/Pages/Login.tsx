import React, { useState, useEffect } from "react";
import api from "../api/client";
import { FiMail, FiUser, FiArrowLeft, FiTag, FiPhone, FiChevronDown } from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [businessType, setBusinessType] = useState("");
    const [businessTypes, setBusinessTypes] = useState<string[]>([]);
    const [phone, setPhone] = useState("");
    const [step, setStep] = useState<"email" | "details">("email");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await api.get("/admin/business-types");
                setBusinessTypes(res.data || []);
            } catch (error) {
                console.error("Failed to fetch admin config", error);
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

    const handleBack = () => {
        setStep("email");
    };

    const handleContinue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;

        if (step === "email") {
            setLoading(true);
            try {
                const res = await api.post("/auth/check-email", { email });
                if (res.data.exists) {
                    await api.post("/auth/send-otp", { email });
                    toast.success("OTP sent! 📧");
                    navigate("/verify-otp", { state: { email, name: res.data.business.name, isNewAccount: false } });
                } else {
                    setStep("details");
                }
            } catch (error: any) {
                toast.error(error?.response?.data?.detail || "An error occurred");
            } finally {
                setLoading(false);
            }
        } else {
            setLoading(true);
            try {
                await api.post("/auth/send-otp", { email, name });
                toast.success("OTP sent! 📧");
                navigate("/verify-otp", { state: { email, name, businessType, phone, isNewAccount: true } });
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

                {step !== "email" && (
                    <button
                        type="button"
                        onClick={handleBack}
                        className="absolute top-6 left-6 text-gray-400 hover:text-gray-700 transition flex items-center gap-1"
                    >
                        <FiArrowLeft /> Back
                    </button>
                )}

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
                        {step === "email" && (
                            <div className="relative group animate-in fade-in duration-300">
                                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="email"
                                    placeholder="Business Email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                />
                            </div>
                        )}

                        {step === "details" && (
                            <div className="space-y-4 animate-in fade-in duration-300 slide-in-from-right-4">
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
                                    <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="tel"
                                        placeholder="Phone Number (10 digits)"
                                        required
                                        maxLength={10}
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                                        className="w-full pl-12 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                    />
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
                            <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                        ) : "Continue"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm font-medium text-gray-600">
                    We'll send a verification code to your email.
                </p>

                <p className="mt-8 text-center text-xs font-medium text-gray-400">
                    By continuing, you agree to our <a href="/terms" className="text-blue-500 hover:underline">Terms of Service</a> & <a href="/privacy" className="text-blue-500 hover:underline">Privacy</a>.
                </p>
            </div>
        </div>
    );
}

import React, { useState } from "react";
import api from "../api/client";
import { FiMail, FiUser, FiArrowRight, FiArrowLeft } from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [step, setStep] = useState<"email" | "name">("email");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleContinue = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (step === "email") {
                const res = await api.post("/auth/check-email", { email });
                if (res.data.exists) {
                    // Existing user - Log them in directly!
                    login(res.data.business);
                    toast.success("Welcome back! 👋");
                    navigate("/dashboard");
                } else {
                    // New user - ask for name
                    setStep("name");
                }
            } else {
                // New user - Send OTP for registration
                await api.post("/auth/send-otp", { email, name });
                toast.success("OTP sent! 📧");
                navigate("/verify-otp", { state: { email, name } });
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex justify-center items-center px-4 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-3xl"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/10 blur-3xl"></div>
            </div>

            <div className="bg-white/80 backdrop-blur-md w-full max-w-md rounded-3xl shadow-xl p-10 z-10 border border-white relative">
                
                {step === "name" && (
                    <button
                        type="button"
                        onClick={() => setStep("email")}
                        className="absolute top-6 left-6 text-gray-400 hover:text-gray-700 transition flex items-center gap-1"
                    >
                        <FiArrowLeft /> Back
                    </button>
                )}

                <div className="text-center mb-8 mt-4">
                    <div className="bg-blue-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/30">
                        <span className="text-2xl font-black">S</span>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        {step === "email" ? "Welcome back" : "Create Account"}
                    </h2>
                    <p className="text-gray-500 mt-2 text-sm font-medium">
                        {step === "email" ? "Enter your email to continue" : "Let's get to know your business"}
                    </p>
                </div>

                <form onSubmit={handleContinue} className="space-y-6">
                    <div className="space-y-4">
                        <div className="relative group">
                            <FiMail className="absolute left-4 top-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="email"
                                placeholder="Business Email"
                                required
                                disabled={step === "name"}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:bg-gray-100 font-medium"
                            />
                        </div>

                        {step === "name" && (
                            <div className="relative group animate-in fade-in duration-300">
                                <FiUser className="absolute left-4 top-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Business/Owner Name"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoFocus
                                    className="w-full pl-12 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                />
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-bold text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-70 flex items-center justify-center gap-2 active:scale-95"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                {step === "email" ? "Continue" : "Send OTP"}
                                <FiArrowRight />
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-8 text-center text-xs font-medium text-gray-400">
                    By continuing, you agree to our Terms of Service & Privacy.
                </p>
            </div>
        </div>
    );
}

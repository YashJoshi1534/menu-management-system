import React, { useState, useEffect } from "react";
import api from "../api/client";
import { FiLock, FiArrowLeft, FiCheckCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function VerifyOTP() {
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const email = location.state?.email;
    const name = location.state?.name;

    useEffect(() => {
        if (!email) {
            navigate("/");
        }
    }, [email, navigate]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) return toast.error("Enter a 6-digit OTP");

        setLoading(true);
        try {
            const res = await api.post("/auth/verify-otp", { email, otp, name });
            login({
                businessId: res.data.businessId,
                name: res.data.name,
                email: res.data.email
            });
            toast.success("Verified successfully! 🎉");

            // Check if business has stores
            const storesRes = await api.get(`/businesses/${res.data.businessId}/stores`);
            if (storesRes.data.length > 0) {
                navigate("/dashboard");
            } else {
                navigate("/store-setup");
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Invalid OTP");
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

            <div className="bg-white/80 backdrop-blur-md w-full max-w-md rounded-3xl shadow-xl p-10 z-10 border border-white text-center relative">
                <button
                    onClick={() => navigate("/")}
                    className="absolute top-6 left-6 text-gray-400 hover:text-gray-700 transition flex items-center gap-1"
                >
                    <FiArrowLeft /> Back
                </button>

                <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner mt-4">
                    <FiLock className="text-2xl text-blue-600" />
                </div>

                <h2 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Check your email</h2>
                <p className="text-gray-500 mb-8 max-w-xs mx-auto text-sm">
                    We sent a 6-digit verification code to <span className="font-semibold text-gray-800">{email}</span>
                </p>

                <form onSubmit={handleVerify} className="space-y-6">
                    <input
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        required
                        autoFocus
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Only allow numbers
                        className="w-full text-center text-4xl tracking-[0.5em] font-bold py-5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-300"
                    />

                    <button
                        type="submit"
                        disabled={loading || otp.length !== 6}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-bold text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                Verify OTP
                                <FiCheckCircle />
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-8 text-sm text-gray-500 font-medium">
                    Didn't receive the code? <button
                        onClick={() => navigate("/")} // Taking back to login, sending OTP again is handled there
                        className="text-blue-600 font-bold hover:text-blue-700 transition"
                    >Resend</button>
                </p>
            </div>
        </div>
    );
}

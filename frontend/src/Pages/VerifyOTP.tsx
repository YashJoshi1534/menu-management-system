import React, { useState, useEffect } from "react";
import api from "../api/client";
import { FiLock, FiArrowLeft, FiCheckCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function VerifyOTP() {
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(30);
    const [waitConfig, setWaitConfig] = useState(30);
    const [isResending, setIsResending] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const email = location.state?.email;
    const name = location.state?.name;
    const businessType = location.state?.businessType;
    const phone = location.state?.phone;
    const logoData = location.state?.logoData;

    useEffect(() => {
        if (!email) {
            navigate("/");
        }

        const fetchConfig = async () => {
            try {
                const res = await api.get("/auth/config");
                if (res.data?.otpResendWaitSeconds) {
                    setWaitConfig(res.data.otpResendWaitSeconds);
                    setResendTimer(res.data.otpResendWaitSeconds);
                }
            } catch (error) {
                console.error("Failed to fetch admin config", error);
            }
        };
        if (email) fetchConfig();
    }, [email, navigate]);

    useEffect(() => {
        let interval: any;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleResend = async () => {
        if (resendTimer > 0) return;
        setIsResending(true);
        try {
            await api.post("/auth/send-otp", { email, name });
            toast.success("OTP sent! 📧");
            setResendTimer(waitConfig);
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Failed to resend OTP");
        } finally {
            setIsResending(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) return toast.error("Enter a 6-digit OTP");

        setLoading(true);
        try {
            const res = await api.post("/auth/verify-otp", {
                email,
                otp,
                name,
                businessType,
                phone,
                logoData
            });
            login({
                businessId: res.data.businessId,
                name: res.data.name,
                email: res.data.email,
                logoUrl: res.data.logoUrl,
                businessType: res.data.businessType,
                phone: res.data.phone,
                contactName: res.data.contactName,
                accessToken: res.data.accessToken,
                refreshToken: res.data.refreshToken
            });
            toast.success("Verified successfully! 🎉");

            // Check if business has outlets
            const outletsRes = await api.get(`/businesses/${res.data.businessId}/outlets`);
            if (outletsRes.data.outlets && outletsRes.data.outlets.length > 0) {
                navigate("/dashboard");
            } else {
                navigate("/outlet-setup");
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Invalid OTP");
        } finally {
            setLoading(false);
        }
    };

    const isNewAccount = location.state?.isNewAccount;

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
                    className="absolute top-6 left-6 text-gray-400 hover:text-gray-700 transition flex items-center gap-1 font-semibold"
                >
                    <FiArrowLeft /> Back
                </button>

                <div className="bg-blue-50 w-16 h-16 rounded-[1.25rem] flex items-center justify-center mx-auto mb-8 shadow-inner mt-4 border border-blue-100/50">
                    <FiLock className="text-2xl text-blue-600" />
                </div>

                <h2 className="text-[2.5rem] font-[900] text-gray-900 mb-2 tracking-tight leading-tight px-4">
                    {isNewAccount ? "Verify your email" : "Welcome back"}
                </h2>
                <p className="text-gray-500 mb-10 max-w-xs mx-auto text-sm font-medium leading-relaxed">
                    Enter the verification code sent to your email.
                </p>

                <form onSubmit={handleVerify} className="space-y-8">
                    <input
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        required
                        autoFocus
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Only allow numbers
                        className="w-full text-center text-2xl tracking-[0.5em] font-bold py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-300 shadow-sm"
                    />

                    <button
                        type="submit"
                        disabled={loading || otp.length !== 6}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-2xl font-bold text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                {isNewAccount ? "Verify Email" : "Sign In"}
                                <FiCheckCircle />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 space-y-1">
                    <p className="text-gray-400 font-medium text-sm tracking-tight">
                        We sent a 6-digit code to your email.
                    </p>
                    <p className="text-sm text-gray-500 font-medium">
                        Didn't receive the code?{" "}
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resendTimer > 0 || isResending}
                            className={`font-bold transition ${resendTimer > 0 || isResending
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-blue-600 hover:text-blue-700"
                                }`}
                        >
                            {isResending ? "Resending..." : resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

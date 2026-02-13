import React, { useState } from "react";
import api from "../api/client";
import { FiUser, FiMapPin, FiMail, FiExternalLink, FiPlusCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function ContactForm() {
    const [formData, setFormData] = useState({
        contactName: "",
        userEmail: "",
        userAddress: "",
    });
    const [loading, setLoading] = useState(false);
    const [existingStores, setExistingStores] = useState<any[]>([]);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await api.post("/contacts/", formData);
            localStorage.setItem("contactId", res.data.contactId);

            if (res.data.existingStores && res.data.existingStores.length > 0) {
                setExistingStores(res.data.existingStores);
                toast.success("Welcome back! " + res.data.message);
            } else {
                toast.success("Contact registered! 🚀");
                setTimeout(() => navigate("/store-setup"), 1000);
            }

        } catch (error: any) {
            console.error(error);
            toast.error(error?.response?.data?.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    if (existingStores.length > 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-center items-center px-4">
                <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-8">
                    <h2 className="text-3xl font-bold text-center mb-2 text-gray-800">Welcome Back! 👋</h2>
                    <p className="text-center text-gray-500 mb-6">Select a store to view or start a new process.</p>

                    <div className="space-y-4 mb-8">
                        {existingStores.map((store: any) => (
                            <div key={store.storeUid} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:border-blue-300 transition group">
                                <span className="font-bold text-gray-800">{store.storeName}</span>
                                <a
                                    href={`/${store.storeUid}/${store.storeName}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 flex items-center gap-2 text-sm font-semibold hover:underline"
                                >
                                    View Website <FiExternalLink />
                                </a>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => navigate("/store-setup")}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg"
                    >
                        <FiPlusCircle className="text-xl" /> Start New Process
                    </button>

                    <button
                        onClick={() => setExistingStores([])}
                        className="w-full mt-4 text-gray-500 hover:text-gray-700 text-sm"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-center items-center px-4">
            <form onSubmit={handleSubmit} className="bg-white w-full max-w-md rounded-xl shadow-xl p-8">
                <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Contact Details</h2>

                <div className="space-y-4">
                    <div className="relative">
                        <FiUser className="absolute left-3 top-3.5 text-gray-400" />
                        <input
                            name="contactName"
                            type="text"
                            placeholder="Full Name"
                            required
                            className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            onChange={handleChange}
                        />
                    </div>

                    <div className="relative">
                        <FiMail className="absolute left-3 top-3.5 text-gray-400" />
                        <input
                            name="userEmail"
                            type="email"
                            placeholder="Email Address"
                            required
                            className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            onChange={handleChange}
                        />
                    </div>

                    <div className="relative">
                        <FiMapPin className="absolute left-3 top-3.5 text-gray-400" />
                        <input
                            name="userAddress"
                            type="text"
                            placeholder="Address"
                            required
                            className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {loading ? "Processing..." : "Next: Store Setup"}
                </button>
            </form>
        </div>
    );
}

import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

export default function PrivacyPolicy() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-3xl p-8 sm:p-12 border border-gray-100 relative">
                <button
                    onClick={() => navigate("/")}
                    className="absolute top-8 left-8 text-gray-400 hover:text-gray-700 transition flex items-center gap-2 font-medium"
                >
                    <FiArrowLeft /> Back to Login
                </button>

                <div className="mt-12">
                    <h1 className="text-4xl font-black text-gray-900 mb-8 tracking-tight">Privacy Policy</h1>
                    
                    <div className="space-y-8 text-gray-600 leading-relaxed">
                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-4">1. Information We Collect</h2>
                            <p>
                                We collect information you provide directly to us when you create an account, such as your business name, email address, and phone number. We also collect data about your store locations and menus to provide our core services.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-4">2. How We Use Your Information</h2>
                            <p>
                                We use the information we collect to:
                            </p>
                            <ul className="list-disc pl-6 mt-2 space-y-2">
                                <li>Provide, maintain, and improve our services.</li>
                                <li>Process transactions and send related information.</li>
                                <li>Send you technical notices, updates, and security alerts.</li>
                                <li>Respond to your comments and questions.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-4">3. Data Security</h2>
                            <p>
                                We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-4">4. Sharing of Information</h2>
                            <p>
                                We do not share your business data with third parties except as required by law or to provide the services you have requested (e.g., displaying your menu to your customers).
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-4">5. Contact Us</h2>
                            <p>
                                If you have any questions about this Privacy Policy, please contact us.
                            </p>
                        </section>
                    </div>

                    <div className="mt-12 pt-8 border-t border-gray-100 text-sm text-gray-400">
                        Last Updated: March 16, 2026
                    </div>
                </div>
            </div>
        </div>
    );
}

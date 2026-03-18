import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

export default function TermsOfService() {
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
                    <h1 className="text-4xl font-black text-gray-900 mb-8 tracking-tight">Terms of Service</h1>
                    
                    <div className="space-y-8 text-gray-600 leading-relaxed">
                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-4">1. Acceptance of Terms</h2>
                            <p>
                                By accessing and using our service, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-4">2. Use License</h2>
                            <p>
                                Permission is granted to temporarily use the materials (information or software) on our website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-4">3. Disclaimer</h2>
                            <p>
                                The materials on our website are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-4">4. Limitations</h2>
                            <p>
                                In no event shall we or our suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on our website.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-4">5. Revisions and Errata</h2>
                            <p>
                                The materials appearing on our website could include technical, typographical, or photographic errors. We do not warrant that any of the materials on its website are accurate, complete, or current. We may make changes to the materials contained on its website at any time without notice.
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

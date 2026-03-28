import React from "react";
import Navbar from "./Navbar";
import ProgressBar from "./ProgressBar";

interface SetupLayoutProps {
    children: React.ReactNode;
    currentStep: 1 | 2 | 3 | 4;
    title?: string;
    subtitle?: string;
}

const SetupLayout: React.FC<SetupLayoutProps> = ({ children, currentStep, title, subtitle }) => {
    return (
        <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
            <Navbar />
            
            <main className="flex-1 flex flex-col items-center p-4 md:p-8">
                <div className="w-full max-w-6xl bg-white rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col min-h-[80vh] overflow-hidden">
                    {/* Progress Bar Area */}
                    <div className="pt-10 pb-6 px-10">
                        <ProgressBar currentStep={currentStep} />
                    </div>

                    {/* Header Area (Optional) */}
                    {(title || subtitle) && (
                        <div className="px-10 pb-6 text-center">
                            {title && <h1 className="text-3xl font-[1000] text-gray-900 tracking-tight">{title}</h1>}
                            {subtitle && <p className="text-gray-400 font-medium mt-1">{subtitle}</p>}
                        </div>
                    )}

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col relative">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SetupLayout;

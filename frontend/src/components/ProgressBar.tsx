import React from 'react';
import { FiShoppingBag, FiUploadCloud, FiCpu, FiCheckCircle } from 'react-icons/fi';

interface ProgressBarProps {
    currentStep: 1 | 2 | 3 | 4;
    outletName?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, outletName }) => {
    const steps = [
        { id: 1, sublabel: outletName || 'Create Outlet', icon: FiShoppingBag },
        { id: 2, sublabel: 'Upload Menu', icon: FiUploadCloud },
        { id: 3, sublabel: 'Review & Edit Menu', icon: FiCpu },
        { id: 4, sublabel: 'Go Live', icon: FiCheckCircle },
    ];

    return (
        <div className="w-full mb-12 relative px-8">
            {/* Background Line Container */}
            <div className="absolute top-[82%] left-14 right-14 h-[3px] bg-gray-100 -translate-y-1/2 z-0 rounded-full overflow-hidden">
                {/* Active Line Progress */}
                <div 
                    className="h-full bg-blue-600 transition-all duration-700 ease-in-out rounded-full"
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                ></div>
            </div>

            <div className="flex items-center justify-between relative">
                {steps.map((step, index) => {
                    const isActive = step.id <= currentStep;
                    const isProcessing = step.id === currentStep;
                    
                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center">
                            {/* Label Above */}
                            <div className="mb-4 min-h-[30px] flex items-end justify-center relative h-10 w-full">
                                <span className={`
                                    text-[9px] md:text-[11px] font-[1000] tracking-[0.15em] transition-colors duration-500 whitespace-nowrap uppercase
                                    ${isActive ? 'text-blue-600' : 'text-gray-300'}
                                    ${index === 0 ? 'absolute left-0' : index === steps.length - 1 ? 'absolute right-0 text-right' : 'text-center'}
                                `}>
                                    {step.sublabel}
                                </span>
                            </div>

                            {/* Icon Circle */}
                            <div className={`
                                w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg border-2
                                ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200' : 'bg-white border-gray-100 text-gray-300 shadow-none'}
                                ${isProcessing ? 'ring-8 ring-blue-50 scale-100' : ''}
                            `}>
                                <step.icon className={`text-lg md:text-xl ${isProcessing ? 'animate-pulse' : ''}`} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProgressBar;

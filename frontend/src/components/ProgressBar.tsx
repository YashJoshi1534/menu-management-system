import React from 'react';
import { FiShoppingBag, FiUploadCloud, FiCpu, FiCheckCircle } from 'react-icons/fi';

interface ProgressBarProps {
    currentStep: 1 | 2 | 3 | 4;
}

const steps = [
    { id: 1, label: 'Setup', icon: FiShoppingBag },
    { id: 2, label: 'Upload', icon: FiUploadCloud },
    { id: 3, label: 'Generate', icon: FiCpu },
    { id: 4, label: 'Finish', icon: FiCheckCircle },
];

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep }) => {
    return (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between relative px-5">
                {/* Background Line Container */}
                <div className="absolute top-1/2 left-5 right-5 h-1 bg-gray-100 -translate-y-1/2 z-0 rounded-full overflow-hidden">
                    {/* Active Line Progress */}
                    <div 
                        className="h-full bg-blue-500 transition-all duration-700 ease-in-out rounded-full"
                        style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                    ></div>
                </div>

                {steps.map((step) => {
                    const isActive = step.id <= currentStep;
                    const isProcessing = step.id === currentStep;
                    
                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                            <div className={`
                                w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm
                                ${isActive ? 'bg-blue-600 text-white shadow-blue-200 shadow-lg' : 'bg-white border-2 border-gray-100 text-gray-300'}
                                ${isProcessing ? 'ring-4 ring-blue-100 scale-110' : ''}
                            `}>
                                <step.icon className={`text-lg ${isProcessing ? 'animate-pulse' : ''}`} />
                            </div>
                            <span className={`text-[10px] uppercase tracking-widest font-black transition-colors duration-500 ${isActive ? 'text-blue-600' : 'text-gray-300'}`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProgressBar;

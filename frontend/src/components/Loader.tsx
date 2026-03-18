import React from 'react';

const Loader: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/60 backdrop-blur-[2px] animate-in fade-in duration-300">
            <div className="flex flex-col items-center gap-4">
                <div className="relative w-16 h-16">
                    {/* Main blue spinner */}
                    <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg"></div>
                </div>
                <p className="text-blue-600 font-bold text-sm tracking-widest uppercase animate-pulse">Loading...</p>
            </div>
        </div>
    );
};

export default Loader;

import { useState, useEffect, useRef } from "react";
import { FiSearch } from "react-icons/fi";

interface SearchInputProps {
    initialValue: string;
    onSearch: (v: string) => void;
    placeholder: string;
}

export default function SearchInput({ initialValue, onSearch, placeholder }: SearchInputProps) {
    const [localValue, setLocalValue] = useState(initialValue);
    const lastEmittedValue = useRef(initialValue);
    
    useEffect(() => {
        if (localValue === lastEmittedValue.current) return;

        const timer = setTimeout(() => {
            lastEmittedValue.current = localValue;
            onSearch(localValue);
        }, 500);
        return () => clearTimeout(timer);
    }, [localValue, onSearch]);

    return (
        <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
                placeholder={placeholder}
                className="w-full pl-10 pr-4 py-3 md:py-4 bg-white/50 backdrop-blur-md border border-slate-100 rounded-[1rem] md:rounded-[1.5rem] font-bold text-slate-900 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
            />
        </div>
    );
}

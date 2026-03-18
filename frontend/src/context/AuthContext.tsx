import React, { createContext, useContext, useState } from "react";

interface Business {
    businessId: string;
    name: string;
    email: string;
}

interface AuthContextType {
    business: Business | null;
    isAuthenticated: boolean;
    login: (business: Business) => void;
    logout: () => void;
    selectedStoreUid: string | null;
    setSelectedStoreUid: (uid: string | null) => void;
    globalLoading: boolean;
    setGlobalLoading: (loading: boolean) => void;
}

// Cookie Helpers
const setCookie = (name: string, value: string, days = 7) => {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

const getCookie = (name: string) => {
    return document.cookie.split("; ").reduce((r, v) => {
        const parts = v.split("=");
        return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, "");
};

const removeCookie = (name: string) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Synchronous initialization to prevent redirect on refresh
    const [business, setBusiness] = useState<Business | null>(() => {
        const saved = getCookie("business");
        return saved ? JSON.parse(saved) : null;
    });

    const [selectedStoreUid, setSelectedStoreUid] = useState<string | null>(() => {
        return getCookie("storeUid") || null;
    });

    const login = (biz: Business) => {
        setBusiness(biz);
        setCookie("business", JSON.stringify(biz));
    };

    const logout = () => {
        setBusiness(null);
        setSelectedStoreUid(null);
        removeCookie("business");
        removeCookie("storeUid");
        // Clear all local storage session data
        localStorage.clear();
        // Redirect to login
        window.location.href = "/";
    };

    const [globalLoading, setGlobalLoading] = useState(false);

    const handleSetSelectedStoreUid = (uid: string | null) => {
        setSelectedStoreUid(uid);
        if (uid) {
            setCookie("storeUid", uid);
        } else {
            removeCookie("storeUid");
        }
    };

    return (
        <AuthContext.Provider value={{
            business,
            isAuthenticated: !!business,
            login,
            logout,
            selectedStoreUid,
            setSelectedStoreUid: handleSetSelectedStoreUid,
            globalLoading,
            setGlobalLoading
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

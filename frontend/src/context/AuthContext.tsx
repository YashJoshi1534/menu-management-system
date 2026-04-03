import React, { createContext, useContext, useState } from "react";
import { getCookie, setCookie, removeCookie } from "../utils/cookies";

interface Business {
    businessId: string;
    name: string;
    email: string;
    logoUrl?: string;
    businessType?: string;
    phone?: string;
    contactName?: string;
    accessToken?: string;
    refreshToken?: string;
}

interface AuthContextType {
    business: Business | null;
    isAuthenticated: boolean;
    login: (business: Business) => void;
    updateBusiness: (updates: Partial<Business>) => void;
    logout: () => void;
    selectedOutletUid: string | null;
    setSelectedOutletUid: (uid: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Synchronous initialization to prevent redirect on refresh
    const [business, setBusiness] = useState<Business | null>(() => {
        const saved = getCookie("business");
        return saved ? JSON.parse(saved) : null;
    });

    const [selectedOutletUid, setSelectedOutletUid] = useState<string | null>(() => {
        return getCookie("outletUid") || null;
    });

    const login = (biz: Business) => {
        setBusiness(biz);
        setCookie("business", JSON.stringify(biz));
        if (biz.accessToken) setCookie("accessToken", biz.accessToken);
        if (biz.refreshToken) setCookie("refreshToken", biz.refreshToken);
    };

    const updateBusiness = (updates: Partial<Business>) => {
        if (!business) return;
        const updated = { ...business, ...updates };
        setBusiness(updated);
        setCookie("business", JSON.stringify(updated));
    };

    const logout = () => {
        setBusiness(null);
        setSelectedOutletUid(null);
        removeCookie("business");
        removeCookie("outletUid");
        removeCookie("accessToken");
        removeCookie("refreshToken");
        // Clear all local storage session data
        localStorage.clear();
        // Redirect to login
        window.location.href = "/";
    };


    const handleSetSelectedOutletUid = (uid: string | null) => {
        setSelectedOutletUid(uid);
        if (uid) {
            setCookie("outletUid", uid);
        } else {
            removeCookie("outletUid");
        }
    };

    return (
        <AuthContext.Provider value={{
            business,
            isAuthenticated: !!business,
            login,
            updateBusiness,
            logout,
            selectedOutletUid,
            setSelectedOutletUid: handleSetSelectedOutletUid,
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

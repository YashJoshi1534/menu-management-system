import React, { createContext, useContext, useState, useEffect } from "react";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [business, setBusiness] = useState<Business | null>(null);
    const [selectedStoreUid, setSelectedStoreUid] = useState<string | null>(localStorage.getItem("storeUid"));

    useEffect(() => {
        const storedBusiness = localStorage.getItem("business");
        if (storedBusiness) {
            setBusiness(JSON.parse(storedBusiness));
        }
    }, []);

    const login = (biz: Business) => {
        setBusiness(biz);
        localStorage.setItem("business", JSON.stringify(biz));
        localStorage.setItem("businessId", biz.businessId);
    };

    const logout = () => {
        setBusiness(null);
        setSelectedStoreUid(null);
        localStorage.clear();
        window.location.href = "/";
    };

    const handleSetSelectedStoreUid = (uid: string | null) => {
        setSelectedStoreUid(uid);
        if (uid) {
            localStorage.setItem("storeUid", uid);
        } else {
            localStorage.removeItem("storeUid");
        }
    };

    return (
        <AuthContext.Provider value={{
            business,
            isAuthenticated: !!business,
            login,
            logout,
            selectedStoreUid,
            setSelectedStoreUid: handleSetSelectedStoreUid
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

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Me, AuthStatus } from "@/types/auth";
import { useRouter } from "next/navigation";

interface AuthContextType {
    me: Me | null;
    authStatus: AuthStatus;
    checkAuth: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [me, setMe] = useState<Me | null>(null);
    const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
    const router = useRouter();

    const checkAuth = async () => {
        // Ideally set checking only if verify heavy logic, but for now we might want to keep current state visible
        // or set checking if we want to block UI updates.
        // However, L-001 says "ProtectedLayout mount -> checkAuth".
        // We'll allow checkAuth to update state.

        try {
            const { data } = await api.get<Me>("/api/auth/me");
            setMe(data);
            setAuthStatus("authed");
        } catch (e) {
            // If error (401 etc), we are guest
            setMe(null);
            setAuthStatus("guest");
        }
    };

    const logout = async () => {
        try {
            await api.post("/api/auth/logout");
        } catch (e) {
            console.error("Logout failed", e);
            // Even if server fails, we clear local state
        } finally {
            setMe(null);
            setAuthStatus("guest");
            router.push("/login");
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ me, authStatus, checkAuth, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

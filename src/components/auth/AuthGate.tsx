"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { useRouter } from "next/navigation";

export function AuthGate({ children }: { children: React.ReactNode }) {
    const { authStatus } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (authStatus === "guest") {
            router.replace("/login");
        }
    }, [authStatus, router]);

    if (authStatus === "checking") {
        // Basic loading placeholder as per L-001 8.1
        return <div>Loading...</div>; // TODO: Replace with Skeleton later if needed
    }

    if (authStatus === "guest") {
        return null; // Will redirect
    }

    // authed
    return <>{children}</>;
}

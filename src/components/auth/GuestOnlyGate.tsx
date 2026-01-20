"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { useRouter } from "next/navigation";

export function GuestOnlyGate({ children }: { children: React.ReactNode }) {
    const { authStatus } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (authStatus === "authed") {
            router.replace("/");
        }
    }, [authStatus, router]);

    if (authStatus === "checking") {
        // Show nothing or loader while checking
        return null;
    }

    if (authStatus === "authed") {
        return null; // Will redirect
    }

    // guest
    return <>{children}</>;
}

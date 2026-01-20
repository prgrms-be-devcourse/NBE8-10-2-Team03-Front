"use client";

import React from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProtectedHeader } from "./header/ProtectedHeader";
import { SideNav } from "./SideNav";

interface ProtectedLayoutProps {
    children: React.ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
    // L-001 8.2: GlobalError area (placeholder for now)
    // L-001 4.3: AuthGate wraps the content
    // L-001 3.1: Header (Fixed) + Body (SideNav + Content)

    return (
        <AuthGate>
            <div className="min-h-screen flex flex-col">
                <ProtectedHeader />
                <div className="flex flex-1">
                    <SideNav />
                    <main className="flex-1 p-6 overflow-auto">
                        {/* Global Error Placeholder */}
                        {/* <div className="mb-4 p-4 bg-red-50 text-red-600 rounded">Error Message Here</div> */}

                        {children}
                    </main>
                </div>
            </div>
        </AuthGate>
    );
}

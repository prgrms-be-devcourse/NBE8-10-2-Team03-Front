import React from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { GuestOnlyGate } from "@/components/auth/GuestOnlyGate";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <GuestOnlyGate>
            <PublicLayout>{children}</PublicLayout>
        </GuestOnlyGate>
    );
}

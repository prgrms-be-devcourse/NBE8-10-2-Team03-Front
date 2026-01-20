"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthProvider";

export function ProtectedHeader() {
    const { me, logout } = useAuth();

    return (
        <header className="flex h-16 items-center justify-between border-b px-6 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-4">
                <Link href="/" className="text-xl font-bold">
                    C2C Service
                </Link>
            </div>

            <div className="flex items-center gap-4">
                {me ? (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{me.nickname || me.email}</span>
                        <span className="text-xs text-gray-500">님</span>
                    </div>
                ) : (
                    <div className="h-5 w-24 animate-pulse bg-gray-200 rounded" />
                )}
                <button
                    onClick={logout}
                    className="text-sm text-red-500 hover:underline border px-3 py-1 rounded hover:bg-red-50"
                >
                    로그아웃
                </button>
            </div>
        </header>
    );
}

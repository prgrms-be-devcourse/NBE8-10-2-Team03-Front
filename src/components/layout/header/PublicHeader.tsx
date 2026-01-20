"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthProvider";

export function PublicHeader() {
    const { authStatus } = useAuth();

    return (
        <header className="flex h-16 items-center justify-between border-b px-6">
            <div className="flex items-center gap-8">
                <Link href="/" className="text-xl font-bold">
                    C2C Service
                </Link>
                <nav className="flex gap-6">
                    <Link href="/posts" className="hover:underline">
                        중고거래
                    </Link>
                    <Link href="/auctions" className="hover:underline">
                        경매
                    </Link>
                </nav>
            </div>

            <div className="flex gap-4">
                {authStatus === "checking" ? (
                    // Placeholder or hidden as per L-002 7.1
                    <div className="h-8 w-20 animate-pulse bg-gray-200 rounded" />
                ) : authStatus === "authed" ? (
                    <>
                        <Link href="/mypage" className="hover:underline">
                            마이페이지
                        </Link>
                        <Link href="/chat" className="hover:underline">
                            채팅
                        </Link>
                    </>
                ) : (
                    <>
                        <Link href="/login" className="hover:underline">
                            로그인
                        </Link>
                        <Link href="/signup" className="hover:underline">
                            회원가입
                        </Link>
                    </>
                )}
            </div>
        </header>
    );
}

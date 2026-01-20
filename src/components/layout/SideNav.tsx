"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
    { label: "마이페이지", href: "/mypage" },
    { label: "채팅", href: "/chat" },
    { label: "중고거래", href: "/posts" },
    { label: "경매", href: "/auctions" },
];

export function SideNav() {
    const pathname = usePathname();

    return (
        <aside className="w-64 border-r bg-gray-50 hidden md:block h-[calc(100vh-64px)] overflow-y-auto sticker top-16">
            <nav className="flex flex-col p-4 gap-2">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? "bg-blue-50 text-blue-600 border border-blue-100"
                                    : "text-gray-700 hover:bg-gray-100"
                                }`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}

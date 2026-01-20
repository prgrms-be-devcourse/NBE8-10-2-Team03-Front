"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { AuctionCard } from "@/components/auctions/AuctionCard";
import { AuctionFilterBar } from "@/components/auctions/AuctionFilterBar";
import { useAuth } from "@/contexts/AuthProvider";

// P-007 4.1 State Model
interface Auction {
    id: number;
    title: string;
    currentPrice: number;
    endAt: string;
    status: string;
    thumbnailUrl?: string;
}

export default function AuctionsPage() {
    const router = useRouter();
    const { authStatus } = useAuth();

    const [auctions, setAuctions] = useState<Auction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Initial filter state
    const [filter, setFilter] = useState({
        status: "OPEN",
        keyword: "",
        sort: "LATEST",
    });

    const fetchAuctions = useCallback(async (currentFilter: typeof filter) => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const params: any = {
                status: currentFilter.status,
                sort: currentFilter.sort,
                size: 20,
            };
            if (currentFilter.keyword) params.keyword = currentFilter.keyword;

            const queryString = new URLSearchParams(
                Object.entries(params).map(([k, v]) => [k, String(v)])
            ).toString();

            const { data } = await api.get<Auction[]>(`/api/auctions?${queryString}`);

            const list = Array.isArray(data) ? data : (data as any).content || [];
            setAuctions(list);
        } catch (e: any) {
            setErrorMessage(e.message || "경매 목록을 불러오는데 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAuctions(filter);
    }, [filter, fetchAuctions]);

    const handleSearch = (newParams: { status: string; keyword: string; sort: string }) => {
        setFilter(newParams);
    };

    const handleWriteClick = () => {
        if (authStatus !== "authed") {
            router.push("/login");
        } else {
            router.push("/auctions/write");
        }
    };

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold font-gray-900">경매장</h1>
                <button
                    onClick={handleWriteClick}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium transition-colors"
                >
                    경매 등록하기
                </button>
            </div>

            <AuctionFilterBar onSearch={handleSearch} />

            {isLoading ? (
                <div className="py-20 text-center text-gray-500">로딩 중...</div>
            ) : errorMessage ? (
                <div className="py-20 text-center text-red-500 bg-red-50 rounded-lg">
                    {errorMessage}
                </div>
            ) : auctions.length === 0 ? (
                <div className="py-20 text-center text-gray-500 bg-gray-50 rounded-lg">
                    진행 중인 경매가 없습니다.
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {auctions.map((auction) => (
                        <AuctionCard key={auction.id} auction={auction} />
                    ))}
                </div>
            )}
        </div>
    );
}

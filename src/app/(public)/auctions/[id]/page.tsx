"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client";
import { useAuth } from "@/contexts/AuthProvider";

// P-008 4.1 State Model
interface Seller {
    id: number;
    nickname: string;
    reputation?: number;
}

interface AuctionDetail {
    id: number;
    title: string;
    description: string;
    images: string[];
    status: string; // "OPEN" | "CLOSED"
    startPrice: number;
    currentPrice: number;
    buyNowPrice?: number;
    startAt: string;
    endAt: string;
    seller: Seller;
    winner?: {
        id: number;
        nickname: string;
    };
    finalPrice?: number;
}

export default function AuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const auctionId = Number(resolvedParams.id);

    const router = useRouter();
    const { me, authStatus } = useAuth();

    const [auction, setAuction] = useState<AuctionDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Bid State
    const [bidAmount, setBidAmount] = useState<string>("");
    const [isBidding, setIsBidding] = useState(false);
    const [bidError, setBidError] = useState<string | null>(null);

    const fetchAuction = async () => {
        // Keep loading true only on first load? Or maybe just keep UI responsive.
        // Spec 5.3: "Re-fetch after successful bid".
        // We don't necessarily toggle full page loading for refresher, but for now simplify.
        try {
            const { data } = await api.get<AuctionDetail>(`/api/auctions/${auctionId}`);
            setAuction(data);
            // Logic for pre-filling bid amount? (e.g. current + min increment). 
            // MVP doesn't specify, just empty or user input.
        } catch (e: any) {
            setErrorMessage(e.message || "경매 정보를 불러오는데 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (auctionId) {
            fetchAuction();
        }
    }, [auctionId]);

    const handleBid = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auction) return;
        setBidError(null);

        // Auth check
        if (authStatus !== "authed") {
            router.push("/login");
            return;
        }

        // Validation P-008 6.4
        const amount = Number(bidAmount);
        if (!amount || isNaN(amount)) {
            setBidError("올바른 입찰가를 입력해주세요.");
            return;
        }
        if (amount <= auction.currentPrice) {
            setBidError("현재가보다 높은 금액으로 입찰해야 합니다.");
            return;
        }

        setIsBidding(true);
        try {
            await api.post(`/api/auctions/${auctionId}/bids`, { amount });
            alert("입찰에 성공했습니다.");
            setBidAmount("");
            // Re-fetch auction info
            await fetchAuction();
        } catch (e: any) {
            // Show error message
            setBidError(e.message || "입찰 실패");
        } finally {
            setIsBidding(false);
        }
    };

    const handleBuyNow = async () => {
        if (!auction) return;
        if (authStatus !== "authed") {
            router.push("/login");
            return;
        }

        if (!confirm(`즉시구매가 ${auction.buyNowPrice?.toLocaleString()}원에 구매하시겠습니까?`)) return;

        try {
            await api.post(`/api/auctions/${auctionId}/buy-now`);
            alert("낙찰되었습니다! (즉시구매 성공)");
            await fetchAuction();
        } catch (e: any) {
            alert(e.message || "즉시구매 실패");
        }
    };

    if (isLoading) {
        return <div className="py-20 text-center text-gray-500">로딩 중...</div>;
    }

    if (errorMessage || !auction) {
        return (
            <div className="py-20 text-center text-red-500 bg-red-50 rounded-lg mx-6 mt-6">
                {errorMessage || "경매를 찾을 수 없습니다."}
            </div>
        );
    }

    const isSeller = me?.id === auction.seller.id;
    const isClosed = auction.status === "CLOSED";
    // Check if user is the winner? `auction.winner?.id === me.id`

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Image Area */}
                <div className="bg-gray-100 rounded-lg aspect-w-4 aspect-h-3 flex items-center justify-center overflow-hidden">
                    {auction.images && auction.images.length > 0 ? (
                        <img src={auction.images[0]} alt={auction.title} className="object-cover w-full h-full" />
                    ) : (
                        <span className="text-gray-400">이미지 없음</span>
                    )}
                </div>

                {/* Info Area */}
                <div className="flex flex-col">
                    {/* Header */}
                    <div className="border-b pb-6 mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 text-xs font-bold rounded ${isClosed ? "bg-gray-200 text-gray-600" : "bg-blue-100 text-blue-700"}`}>
                                {auction.status}
                            </span>
                            <span className="text-sm text-gray-500">마감: {new Date(auction.endAt).toLocaleString()}</span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{auction.title}</h1>

                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-500 mb-1">현재 입찰가</p>
                            <p className="text-3xl font-bold text-blue-600">{auction.currentPrice.toLocaleString()}원</p>
                            {auction.buyNowPrice && (
                                <p className="text-sm text-gray-500 mt-2">
                                    즉시구매가: <span className="font-medium text-gray-900">{auction.buyNowPrice.toLocaleString()}원</span>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* SellerInfo */}
                    <div className="flex items-center justify-between mb-8 p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold">
                                {auction.seller.nickname.charAt(0)}
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">{auction.seller.nickname}</p>
                            </div>
                        </div>
                    </div>

                    {/* Content Description */}
                    <div className="flex-1 whitespace-pre-wrap text-gray-700 mb-8 min-h-[100px]">
                        {auction.description}
                    </div>

                    {/* Action Area */}
                    <div className="mt-auto">
                        {/* Case: CLOSED */}
                        {isClosed ? (
                            <div className="bg-gray-100 p-6 rounded-lg text-center">
                                <p className="text-lg font-bold text-gray-800 mb-2">경매가 종료되었습니다.</p>
                                {auction.winner ? (
                                    <div className="text-gray-700">
                                        낙찰자: <span className="font-bold">{auction.winner.nickname}</span> <br />
                                        낙찰가: {auction.finalPrice?.toLocaleString()}원
                                    </div>
                                ) : (
                                    <p className="text-gray-500">낙찰자 없이 종료되었습니다.</p>
                                )}
                            </div>
                        ) : (
                            /* Case: OPEN */
                            isSeller ? (
                                <div className="bg-blue-50 p-4 rounded-lg text-center text-blue-700 font-medium">
                                    자신의 경매에는 입찰할 수 없습니다.
                                </div>
                            ) : (
                                /* Buyer Action */
                                <div className="space-y-4">
                                    {/* Bid Form */}
                                    <form onSubmit={handleBid} className="border p-4 rounded-lg bg-white shadow-sm">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">입찰하기</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                value={bidAmount}
                                                onChange={(e) => setBidAmount(e.target.value)}
                                                placeholder="입찰금액 입력"
                                                className="flex-1 block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                                            />
                                            <button
                                                type="submit"
                                                disabled={isBidding}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-bold disabled:bg-gray-400 whitespace-nowrap"
                                            >
                                                입찰
                                            </button>
                                        </div>
                                        {bidError && <p className="mt-2 text-sm text-red-600">{bidError}</p>}
                                    </form>

                                    {/* Buy Now Button */}
                                    {auction.buyNowPrice && (
                                        <button
                                            onClick={handleBuyNow}
                                            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                                        >
                                            {auction.buyNowPrice.toLocaleString()}원에 바로 낙찰받기
                                        </button>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

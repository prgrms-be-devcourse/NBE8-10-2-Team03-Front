"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useAuth } from "@/contexts/AuthProvider";
import { PostCard } from "@/components/posts/PostCard";
import { AuctionCard } from "@/components/auctions/AuctionCard";

// Types
interface Reputation {
    score: number;
}

interface MyPost {
    id: number;
    title: string;
    price: number;
    status: string;
    thumbnailUrl?: string;
    createdAt: string;
}

interface MyAuction {
    id: number;
    title: string;
    currentPrice: number;
    endAt: string;
    status: string;
    thumbnailUrl?: string;
}

export default function MyPage() {
    const { me, authStatus, logout } = useAuth();

    // State
    const [reputation, setReputation] = useState<Reputation | null>(null);
    const [myPosts, setMyPosts] = useState<MyPost[]>([]);
    const [myAuctions, setMyAuctions] = useState<MyAuction[]>([]);

    // Loading & Error States
    const [isReputationLoading, setIsReputationLoading] = useState(true);
    const [isPostsLoading, setIsPostsLoading] = useState(true);
    const [isAuctionsLoading, setIsAuctionsLoading] = useState(true);

    // Section Errors
    const [postsError, setPostsError] = useState<string | null>(null);
    const [auctionsError, setAuctionsError] = useState<string | null>(null);

    // Tab State
    const [activeTab, setActiveTab] = useState<"POSTS" | "AUCTIONS">("POSTS");

    useEffect(() => {
        // Spec 5.3: Profile failure -> Full Page Error handled by AuthGate/ProtectedLayout largely,
        // but here we are guaranteed 'me' exists because of ProtectedLayout.

        // Fetch Reputation
        const fetchReputation = async () => {
            try {
                const { data } = await api.get<Reputation>("/api/reputations/me");
                setReputation(data);
            } catch (e) {
                // Spec 5.3: Section failure -> Hide or show error?
                // Spec 6.2: "No reputation -> hide or default". 
                // Let's hide error for reputation and just show nothing or default.
            } finally {
                setIsReputationLoading(false);
            }
        };

        // Fetch My Posts
        const fetchMyPosts = async () => {
            try {
                // Spec 5.2: GET /api/posts?mine=true
                // Assuming Backend supports this param.
                const { data } = await api.get<MyPost[]>("/api/posts?mine=true&size=10");
                const list = Array.isArray(data) ? data : (data as any).content || [];
                setMyPosts(list);
            } catch (e: any) {
                setPostsError("내 글 목록을 불러오는데 실패했습니다.");
            } finally {
                setIsPostsLoading(false);
            }
        };

        // Fetch My Auctions
        const fetchMyAuctions = async () => {
            try {
                const { data } = await api.get<MyAuction[]>("/api/auctions?mine=true&size=10");
                const list = Array.isArray(data) ? data : (data as any).content || [];
                setMyAuctions(list);
            } catch (e: any) {
                setAuctionsError("내 경매 목록을 불러오는데 실패했습니다.");
            } finally {
                setIsAuctionsLoading(false);
            }
        };

        if (authStatus === "authed") {
            fetchReputation();
            fetchMyPosts();
            fetchMyAuctions();
        }
    }, [authStatus]);

    if (!me) return null; // Should be handled by layout logic

    return (
        <div className="container mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold mb-8 text-gray-900">마이페이지</h1>

            {/* Profile & Reputation Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border mb-8 flex flex-col md:flex-row items-center gap-6">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-2xl font-bold text-gray-500">
                    {me.nickname.charAt(0)}
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h2 className="text-xl font-bold text-gray-900">{me.nickname}</h2>
                    <p className="text-gray-500 text-sm mb-2">{me.email}</p>
                    {reputation ? (
                        <div className="inline-block bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                            매너온도 {reputation.score}°C
                        </div>
                    ) : (
                        !isReputationLoading && <span className="text-xs text-gray-400">아직 평가된 매너온도가 없습니다.</span>
                    )}
                </div>
                <div>
                    <button
                        onClick={logout}
                        className="text-gray-500 hover:text-gray-700 underline text-sm"
                    >
                        로그아웃
                    </button>
                </div>
            </div>

            {/* Activity Tabs */}
            <div className="mb-6 border-b">
                <div className="flex gap-6">
                    <button
                        className={`py-2 px-1 border-b-2 font-medium transition-colors ${activeTab === "POSTS"
                                ? "border-indigo-600 text-indigo-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                        onClick={() => setActiveTab("POSTS")}
                    >
                        내 중고거래 글
                    </button>
                    <button
                        className={`py-2 px-1 border-b-2 font-medium transition-colors ${activeTab === "AUCTIONS"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                        onClick={() => setActiveTab("AUCTIONS")}
                    >
                        내 경매
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[200px]">
                {activeTab === "POSTS" && (
                    <div>
                        {isPostsLoading ? (
                            <div className="text-center py-10 text-gray-500">로딩 중...</div>
                        ) : postsError ? (
                            <div className="text-center py-10 text-red-500 bg-red-50 rounded-lg">{postsError}</div>
                        ) : myPosts.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">작성한 중고거래 글이 없습니다.</div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {myPosts.map(post => <PostCard key={post.id} post={post} />)}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "AUCTIONS" && (
                    <div>
                        {isAuctionsLoading ? (
                            <div className="text-center py-10 text-gray-500">로딩 중...</div>
                        ) : auctionsError ? (
                            <div className="text-center py-10 text-red-500 bg-red-50 rounded-lg">{auctionsError}</div>
                        ) : myAuctions.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">등록한 경매가 없습니다.</div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {myAuctions.map(auction => <AuctionCard key={auction.id} auction={auction} />)}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

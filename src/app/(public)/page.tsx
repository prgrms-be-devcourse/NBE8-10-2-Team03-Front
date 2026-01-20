"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { PostCard } from "@/components/posts/PostCard";
import { AuctionCard } from "@/components/auctions/AuctionCard";

// Types for Preview (subset)
interface PostPreview {
    id: number;
    title: string;
    price: number;
    status: string;
    thumbnailUrl?: string;
    createdAt: string;
}

interface AuctionPreview {
    id: number;
    title: string;
    currentPrice: number;
    endAt: string;
    status: string;
    thumbnailUrl?: string;
}

export default function MainPage() {
    const [recentPosts, setRecentPosts] = useState<PostPreview[]>([]);
    const [openAuctions, setOpenAuctions] = useState<AuctionPreview[]>([]);
    const [isPostsLoading, setIsPostsLoading] = useState(true);
    const [isAuctionsLoading, setIsAuctionsLoading] = useState(true);

    useEffect(() => {
        // 5.3 API Strategy: Call on mount
        const fetchPosts = async () => {
            try {
                const { data } = await api.get<PostPreview[]>("/api/posts?size=4");
                // Spec 5.3: Success -> Render
                // API might return { content: [] } if paged, but spec 1.1 says `data: {}`.
                // CONTRACT_API 3.1 says data can be null.
                // Assuming data is array or Page object. For MVP/Spec 6.3 "Preview", let's assume array of posts
                // If it's a Page object, we need to adapt. 
                // P-004 spec says "posts: Array" in model. Let's assume array or check types later.
                // For now, assume API returns array directly in data or data.content.
                // To be safe against "Page" structure:
                const list = Array.isArray(data) ? data : (data as any).content || [];
                setRecentPosts(list.slice(0, 4));
            } catch (e) {
                // Spec 5.3: Failure -> Hide preview (do nothing, empty list)
            } finally {
                setIsPostsLoading(false);
            }
        };

        const fetchAuctions = async () => {
            try {
                const { data } = await api.get<AuctionPreview[]>("/api/auctions?status=OPEN&size=4");
                const list = Array.isArray(data) ? data : (data as any).content || [];
                setOpenAuctions(list.slice(0, 4));
            } catch (e) {
                // Hide preview
            } finally {
                setIsAuctionsLoading(false);
            }
        };

        fetchPosts();
        fetchAuctions();
    }, []);

    return (
        <div className="space-y-12 pb-12">
            {/* Shortcut Section */}
            <section className="bg-gradient-to-r from-blue-500 to-indigo-600 py-20 text-white">
                <div className="container mx-auto px-6 text-center">
                    <h1 className="text-4xl font-bold mb-4">
                        모든 거래의 시작, C2C Service
                    </h1>
                    <p className="mb-8 text-lg opacity-90">
                        중고거래부터 경매까지, 안전하고 편리하게 이용하세요.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link
                            href="/posts"
                            className="bg-white text-blue-600 px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition-colors shadow-lg"
                        >
                            중고거래 구경하기
                        </Link>
                        <Link
                            href="/auctions"
                            className="bg-blue-800 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-900 transition-colors shadow-lg border border-blue-400"
                        >
                            진행 중인 경매 보기
                        </Link>
                    </div>
                </div>
            </section>

            {/* Post Preview Section */}
            {!isPostsLoading && recentPosts.length > 0 && (
                <section className="container mx-auto px-6">
                    <div className="flex justify-between items-end mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">최근 올라온 중고거래</h2>
                        <Link href="/posts" className="text-sm text-gray-500 hover:text-blue-600">
                            전체보기 &rarr;
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {recentPosts.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </div>
                </section>
            )}

            {/* Auction Preview Section */}
            {!isAuctionsLoading && openAuctions.length > 0 && (
                <section className="container mx-auto px-6">
                    <div className="flex justify-between items-end mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">마감 임박 경매</h2>
                        <Link href="/auctions" className="text-sm text-gray-500 hover:text-blue-600">
                            전체보기 &rarr;
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {openAuctions.map((auction) => (
                            <AuctionCard key={auction.id} auction={auction} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

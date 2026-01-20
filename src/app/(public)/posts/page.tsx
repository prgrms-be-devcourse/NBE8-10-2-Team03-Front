"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { PostCard } from "@/components/posts/PostCard";
import { FilterBar } from "@/components/posts/FilterBar";
import { useAuth } from "@/contexts/AuthProvider";

// P-004 4.1 State Model
interface Post {
    id: number;
    title: string;
    price: number;
    status: string;
    thumbnailUrl?: string;
    createdAt: string;
}

export default function PostsPage() {
    const router = useRouter();
    const { authStatus } = useAuth();

    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Initial filter state
    const [filter, setFilter] = useState({
        categoryId: null as number | null,
        keyword: "",
        sort: "LATEST",
    });

    const fetchPosts = useCallback(async (currentFilter: typeof filter) => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            // Build query params
            const params: any = {
                sort: currentFilter.sort,
                size: 20, // Default size
            };
            if (currentFilter.categoryId) params.categoryId = currentFilter.categoryId;
            if (currentFilter.keyword) params.keyword = currentFilter.keyword;

            // Need to stringify for URLSearchParams or api client handles it?
            // Our api client in `client.ts` takes generic fetch options but doesn't auto-build QS from object body for GET.
            // We need to append query string to url.
            const queryString = new URLSearchParams(
                Object.entries(params).map(([k, v]) => [k, String(v)])
            ).toString();

            const { data } = await api.get<Post[]>(`/api/posts?${queryString}`);

            const list = Array.isArray(data) ? data : (data as any).content || [];
            setPosts(list);
        } catch (e: any) {
            setErrorMessage(e.message || "목록을 불러오는데 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchPosts(filter);
    }, []); // Run once on mount, subsequent runs triggered by handleSearch updates calling fetchPosts directly or effect dependency?
    // P-004 5.3: Re-trigger on change. 
    // Better approach: Effect depends on filter.

    useEffect(() => {
        fetchPosts(filter);
    }, [filter, fetchPosts]);

    const handleSearch = (newParams: { categoryId: number | null; keyword: string; sort: string }) => {
        setFilter(newParams);
    };

    const handleWriteClick = () => {
        if (authStatus !== "authed") {
            router.push("/login");
        } else {
            router.push("/posts/write");
        }
    };

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold font-gray-900">중고거래 매물</h1>
                <button
                    onClick={handleWriteClick}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium transition-colors"
                >
                    글 작성하기
                </button>
            </div>

            <FilterBar onSearch={handleSearch} />

            {isLoading ? (
                <div className="py-20 text-center text-gray-500">로딩 중...</div>
            ) : errorMessage ? (
                <div className="py-20 text-center text-red-500 bg-red-50 rounded-lg">
                    {errorMessage}
                </div>
            ) : posts.length === 0 ? (
                <div className="py-20 text-center text-gray-500 bg-gray-50 rounded-lg">
                    등록된 게시글이 없습니다.
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))}
                </div>
            )}
        </div>
    );
}

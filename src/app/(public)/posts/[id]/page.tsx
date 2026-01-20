"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/client";
import { useAuth } from "@/contexts/AuthProvider";

// P-005 4.1 State Model
interface Seller {
    id: number;
    nickname: string;
    reputation?: number; // Optional
}

interface PostDetail {
    id: number;
    title: string;
    content: string;
    price: number;
    status: string; // "OPEN" | "RESERVED" | "SOLD"
    images: string[];
    seller: Seller;
    createdAt: string;
    updatedAt: string;
}

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrapping params (Next.js 15+ compatible)
    const resolvedParams = use(params);
    const postId = Number(resolvedParams.id);

    const router = useRouter();
    const { me, authStatus } = useAuth();

    const [post, setPost] = useState<PostDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const { data } = await api.get<PostDetail>(`/api/posts/${postId}`);
                setPost(data);
            } catch (e: any) {
                setErrorMessage(e.message || "게시글을 불러오는데 실패했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        if (postId) {
            fetchPost();
        }
    }, [postId]);

    const handleDelete = async () => {
        if (!confirm("정말로 이 게시글을 삭제하시겠습니까?")) return;

        setIsDeleting(true);
        try {
            await api.delete(`/api/posts/${postId}`);
            alert("게시글이 삭제되었습니다.");
            router.replace("/posts");
        } catch (e: any) {
            alert(e.message || "삭제 실패");
            setIsDeleting(false);
        }
    };

    const handleChat = async () => {
        if (!post) return;

        if (authStatus !== "authed") {
            // P-005 6.2: Guest -> Login
            router.push("/login");
            return;
        }

        try {
            // P-005 5.2 POST /api/chat/rooms
            // Maybe we need to pass sellerId or postId to create a room?
            // Assuming API convention for MVP. P-005 doesn't specify payload detailedly but implies "Start Chat".
            // Let's assume we pass postId.
            const { data: room } = await api.post<{ id: number }>("/api/chat/rooms", { postId: post.id });
            router.push(`/chat/${room.id}`);
        } catch (e: any) {
            alert(e.message || "채팅방 생성 실패");
        }
    };

    const handleEdit = () => {
        router.push(`/posts/${postId}/edit`);
    };

    if (isLoading) {
        return <div className="py-20 text-center text-gray-500">로딩 중...</div>;
    }

    if (errorMessage || !post) {
        return (
            <div className="py-20 text-center text-red-500 bg-red-50 rounded-lg mx-6 mt-6">
                {errorMessage || "게시글을 찾을 수 없습니다."}
            </div>
        );
    }

    const isSeller = me?.id === post.seller.id;
    const isSold = post.status === "SOLD";

    return (
        <div className="container mx-auto px-6 py-8">
            {/* 3.1 Content Layout: Image | Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Image Area */}
                <div className="bg-gray-100 rounded-lg aspect-w-4 aspect-h-3 flex items-center justify-center overflow-hidden">
                    {post.images && post.images.length > 0 ? (
                        <img src={post.images[0]} alt={post.title} className="object-cover w-full h-full" />
                    ) : (
                        <span className="text-gray-400">이미지 없음</span>
                    )}
                </div>

                {/* Info Area */}
                <div className="flex flex-col">
                    {/* PostInfo */}
                    <div className="border-b pb-6 mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 text-xs font-bold rounded ${isSold ? "bg-gray-200 text-gray-600" : "bg-green-100 text-green-700"}`}>
                                {post.status}
                            </span>
                            <span className="text-sm text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{post.title}</h1>
                        <p className="text-2xl font-bold text-gray-900">{post.price.toLocaleString()}원</p>
                    </div>

                    {/* SellerInfo */}
                    <div className="flex items-center justify-between mb-8 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold">
                                {post.seller.nickname.charAt(0)}
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">{post.seller.nickname}</p>
                                {post.seller.reputation !== undefined && (
                                    <p className="text-xs text-gray-500">매너온도 {post.seller.reputation}°C</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content Description */}
                    <div className="flex-1 whitespace-pre-wrap text-gray-700 mb-8 min-h-[100px]">
                        {post.content}
                    </div>

                    {/* ActionButtons */}
                    <div className="mt-auto">
                        {isSeller ? (
                            <div className="flex gap-3">
                                <button
                                    onClick={handleEdit}
                                    className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                                >
                                    수정
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex-1 bg-red-50 text-red-600 border border-red-200 py-3 rounded-lg font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                    삭제
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleChat}
                                disabled={isSold}
                                className={`w-full py-4 rounded-lg font-bold text-lg text-white transition-colors ${isSold
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-indigo-600 hover:bg-indigo-700 shadow-md"
                                    }`}
                            >
                                {isSold ? "판매 완료된 상품입니다" : "채팅으로 거래하기"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

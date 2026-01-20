"use client";

import Link from "next/link";

interface PostCardProps {
    post: {
        id: number;
        title: string;
        price: number;
        status: string;
        thumbnailUrl?: string;
        createdAt: string;
    };
}

export function PostCard({ post }: PostCardProps) {
    return (
        <Link href={`/posts/${post.id}`} className="group block border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            <div className="aspect-w-1 aspect-h-1 bg-gray-200">
                {/* Placeholder for real image or next/image */}
                {post.thumbnailUrl ? (
                    <img src={post.thumbnailUrl} alt={post.title} className="object-cover w-full h-48" />
                ) : (
                    <div className="w-full h-48 flex items-center justify-center text-gray-400 bg-gray-100">No Image</div>
                )}
            </div>
            <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                    {post.title}
                </h3>
                <p className="mt-1 text-lg font-bold text-gray-900">
                    {post.price.toLocaleString()}원
                </p>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>{post.status}</span>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        </Link>
    );
}

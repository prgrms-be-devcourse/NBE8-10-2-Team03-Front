"use client";

import Link from "next/link";

interface AuctionCardProps {
    auction: {
        id: number;
        title: string;
        currentPrice: number;
        endAt: string;
        status: string;
        thumbnailUrl?: string;
    };
}

export function AuctionCard({ auction }: AuctionCardProps) {
    // Simple countdown or date display for MVP
    const isClosed = auction.status === 'CLOSED';

    return (
        <Link href={`/auctions/${auction.id}`} className="group block border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            <div className="aspect-w-1 aspect-h-1 bg-gray-200">
                {auction.thumbnailUrl ? (
                    <img src={auction.thumbnailUrl} alt={auction.title} className="object-cover w-full h-48" />
                ) : (
                    <div className="w-full h-48 flex items-center justify-center text-gray-400 bg-gray-100">No Image</div>
                )}
            </div>
            <div className="p-4">
                <div className="flex justify-between items-start">
                    <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 flex-1">
                        {auction.title}
                    </h3>
                    <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${isClosed ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                        {auction.status}
                    </span>
                </div>

                <p className="mt-1 text-lg font-bold text-gray-900">
                    {auction.currentPrice.toLocaleString()}원
                </p>
                <div className="mt-2 text-xs text-gray-500">
                    마감: {new Date(auction.endAt).toLocaleString()}
                </div>
            </div>
        </Link>
    );
}

"use client";

import React, { useState } from "react";

interface AuctionFilterBarProps {
    onSearch: (params: { status: string; keyword: string; sort: string }) => void;
}

export function AuctionFilterBar({ onSearch }: AuctionFilterBarProps) {
    const [status, setStatus] = useState("OPEN");
    const [keyword, setKeyword] = useState("");
    const [sort, setSort] = useState("LATEST");

    const handleSearch = (newStatus?: string) => {
        // If newStatus is provided (tab click), use it. Otherwise use state.
        const currentStatus = newStatus !== undefined ? newStatus : status;
        onSearch({ status: currentStatus, keyword, sort });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6 flex flex-col gap-4">
            {/* Status Tabs */}
            <div className="flex border-b">
                <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${status === "OPEN"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    onClick={() => {
                        setStatus("OPEN");
                        handleSearch("OPEN");
                    }}
                >
                    진행중인 경매
                </button>
                <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${status === "CLOSED"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    onClick={() => {
                        setStatus("CLOSED");
                        handleSearch("CLOSED");
                    }}
                >
                    종료된 경매
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                        placeholder="경매 물품 검색"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        onClick={() => handleSearch()}
                        className="absolute right-2 top-1 bottom-1 px-2 text-gray-500 hover:text-blue-600"
                    >
                        검색
                    </button>
                </div>

                <select
                    className="block w-full md:w-auto rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    value={sort}
                    onChange={(e) => {
                        setSort(e.target.value);
                        // Trigger sort update immediately? Or wait for search button?
                        // Usually sort change triggers fetch immediately.
                        // But here handleSearch uses current state closures if we aren't careful.
                        // We pass the new sort value explicitly if we want immediate update.
                        // For now, let's update state and trigger generic search which uses that state?
                        // Wait, state update is async. Better pass param.
                        onSearch({ status, keyword, sort: e.target.value });
                    }}
                >
                    <option value="LATEST">최신순</option>
                    <option value="PRICE_LOW">낮은가격순</option>
                    <option value="PRICE_HIGH">높은가격순</option>
                    <option value="CLOSING_SOON">마감임박순</option>
                </select>
            </div>
        </div>
    );
}

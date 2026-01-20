"use client";

import React, { useState } from "react";

interface FilterBarProps {
    onSearch: (params: { categoryId: number | null; keyword: string; sort: string }) => void;
}

export function FilterBar({ onSearch }: FilterBarProps) {
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [keyword, setKeyword] = useState("");
    const [sort, setSort] = useState("LATEST");

    const handleSearch = () => {
        onSearch({ categoryId, keyword, sort });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const categories = [
        { id: 1, name: "디지털기기" },
        { id: 2, name: "생활가전" },
        { id: 3, name: "가구/인테리어" },
        // Add more as needed or fetch from API if specified (MVP assumes static or separate API)
    ];

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6 flex flex-col md:flex-row gap-4 items-center">
            <select
                className="block w-full md:w-auto rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                value={categoryId || ""}
                onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setCategoryId(val);
                    // Trigger search immediately on category change? 
                    // Implementation Plan says "Re-fetch on category change" (Item 5.3 in P-004)
                    // But here to avoid closure staleness issues in simple impl, we pass the new value directly.
                    // However, for FilterBar controlled state, we might just update state here and let parent handle trigger
                    // OR trigger callback with new values.
                    onSearch({ categoryId: val, keyword, sort });
                }}
            >
                <option value="">전체 카테고리</option>
                {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.name}
                    </option>
                ))}
            </select>

            <div className="flex-1 w-full relative">
                <input
                    type="text"
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                    placeholder="검색어를 입력하세요"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button
                    onClick={handleSearch}
                    className="absolute right-2 top-1 bottom-1 px-2 text-gray-500 hover:text-indigo-600"
                >
                    검색
                </button>
            </div>

            <select
                className="block w-full md:w-auto rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                value={sort}
                onChange={(e) => {
                    setSort(e.target.value);
                    onSearch({ categoryId, keyword, sort: e.target.value });
                }}
            >
                <option value="LATEST">최신순</option>
                <option value="PRICE_LOW">낮은가격순</option>
                <option value="PRICE_HIGH">높은가격순</option>
            </select>
        </div>
    );
}

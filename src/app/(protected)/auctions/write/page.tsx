"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client";

export default function AuctionWritePage() {
    const router = useRouter();

    const [form, setForm] = useState({
        title: "",
        description: "",
        startPrice: "",
        buyNowPrice: "",
        endAt: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setFieldErrors({});

        // Minimal Frontend Validation
        const newFieldErrors: Record<string, string> = {};
        if (!form.title.trim()) newFieldErrors.title = "제목을 입력해주세요.";
        if (!form.description.trim()) newFieldErrors.description = "설명을 입력해주세요.";
        if (!form.startPrice || Number(form.startPrice) < 0) newFieldErrors.startPrice = "시작가를 입력해주세요.";
        if (!form.endAt) newFieldErrors.endAt = "종료 시간을 선택해주세요.";

        // Optional buyNowPrice check: if exists, must be number > 0
        if (form.buyNowPrice && Number(form.buyNowPrice) <= 0) {
            newFieldErrors.buyNowPrice = "즉시구매가는 0보다 커야 합니다.";
        }

        if (Object.keys(newFieldErrors).length > 0) {
            setFieldErrors(newFieldErrors);
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                title: form.title,
                description: form.description,
                startPrice: Number(form.startPrice),
                buyNowPrice: form.buyNowPrice ? Number(form.buyNowPrice) : undefined,
                endAt: new Date(form.endAt).toISOString(), // Ensure ISO format
            };

            const { data } = await api.post<{ id: number }>("/api/auctions", payload);

            // Success -> Redirect
            router.replace(`/auctions/${data.id}`);
        } catch (e: any) {
            if (e instanceof ApiError && e.resultCode === "400-1") {
                const lines = e.msgLines;
                const errors: Record<string, string> = {};
                let otherMsg = "";

                lines.forEach(line => {
                    const parts = line.split("-");
                    if (parts.length >= 3) {
                        const field = parts[0];
                        const msg = parts.slice(2).join("-");
                        errors[field] = msg;
                    } else {
                        otherMsg += line + "\n";
                    }
                });

                if (Object.keys(errors).length > 0) {
                    setFieldErrors(errors);
                }
                if (otherMsg) {
                    setErrorMessage(otherMsg.trim());
                }
            } else {
                setErrorMessage(e.message || "경매 등록 중 오류가 발생했습니다.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-6 py-8">
            <h1 className="text-2xl font-bold mb-8">경매 등록하기</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {errorMessage && (
                    <div className="bg-red-50 p-4 rounded-lg text-red-600 mb-6 text-center whitespace-pre-wrap">
                        {errorMessage}
                    </div>
                )}

                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">경매 제목</label>
                    <input
                        type="text"
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        placeholder="제목을 입력해주세요"
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                    />
                    {fieldErrors.title && <p className="mt-1 text-sm text-red-600">{fieldErrors.title}</p>}
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        rows={10}
                        placeholder="물품에 대한 상세한 설명을 적어주세요."
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                    />
                    {fieldErrors.description && <p className="mt-1 text-sm text-red-600">{fieldErrors.description}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Start Price */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">시작가</label>
                        <input
                            type="number"
                            name="startPrice"
                            value={form.startPrice}
                            onChange={handleChange}
                            placeholder="0"
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                        />
                        {fieldErrors.startPrice && <p className="mt-1 text-sm text-red-600">{fieldErrors.startPrice}</p>}
                    </div>

                    {/* Buy Now Price (Optional) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">즉시구매가 (선택)</label>
                        <input
                            type="number"
                            name="buyNowPrice"
                            value={form.buyNowPrice}
                            onChange={handleChange}
                            placeholder="미입력 시 경매로만 진행"
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                        />
                        {fieldErrors.buyNowPrice && <p className="mt-1 text-sm text-red-600">{fieldErrors.buyNowPrice}</p>}
                    </div>
                </div>

                {/* End Time */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">경매 종료 시간</label>
                    <input
                        type="datetime-local"
                        name="endAt"
                        value={form.endAt}
                        onChange={handleChange}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                    />
                    {fieldErrors.endAt && <p className="mt-1 text-sm text-red-600">{fieldErrors.endAt}</p>}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        {isSubmitting ? "경매 생성 중..." : "경매 생성"}
                    </button>
                </div>
            </form>
        </div>
    );
}

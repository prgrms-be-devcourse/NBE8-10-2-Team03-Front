"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client";

export default function PostWritePage() {
    const router = useRouter();

    const [form, setForm] = useState({
        categoryId: "",
        title: "",
        content: "",
        price: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Static categories for MVP
    const categories = [
        { id: 1, name: "디지털기기" },
        { id: 2, name: "생활가전" },
        { id: 3, name: "가구/인테리어" },
    ];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setFieldErrors({});

        // Basic frontend validation
        const newFieldErrors: Record<string, string> = {};
        if (!form.categoryId) newFieldErrors.categoryId = "카테고리를 선택해주세요.";
        if (!form.title.trim()) newFieldErrors.title = "제목을 입력해주세요.";
        if (!form.content.trim()) newFieldErrors.content = "내용을 입력해주세요.";
        if (!form.price || Number(form.price) < 0) newFieldErrors.price = "올바른 가격을 입력해주세요.";

        if (Object.keys(newFieldErrors).length > 0) {
            setFieldErrors(newFieldErrors);
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                categoryId: Number(form.categoryId),
                title: form.title,
                content: form.content,
                price: Number(form.price),
                images: [], // Image upload usually separate, empty for MVP unless implemented
            };

            const { data } = await api.post<{ id: number }>("/api/posts", payload);

            // Success -> Redirect to detail
            router.replace(`/posts/${data.id}`);
        } catch (e: any) {
            if (e instanceof ApiError) {
                // Parse 400-1 field errors
                if (e.resultCode === "400-1") {
                    const lines = e.msgLines;
                    const errors: Record<string, string> = {};
                    let otherMsg = "";

                    lines.forEach(line => {
                        // Format: field-code-message
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
                    setErrorMessage(e.message);
                }
            } else {
                setErrorMessage("게시글 등록 중 오류가 발생했습니다.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-6 py-8">
            <h1 className="text-2xl font-bold mb-8">중고거래 글쓰기</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {errorMessage && (
                    <div className="bg-red-50 p-4 rounded-lg text-red-600 mb-6 text-center whitespace-pre-wrap">
                        {errorMessage}
                    </div>
                )}

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                    <select
                        name="categoryId"
                        value={form.categoryId}
                        onChange={handleChange}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    >
                        <option value="">카테고리 선택</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    {fieldErrors.categoryId && <p className="mt-1 text-sm text-red-600">{fieldErrors.categoryId}</p>}
                </div>

                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
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

                {/* Price */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">가격</label>
                    <input
                        type="number"
                        name="price"
                        value={form.price}
                        onChange={handleChange}
                        placeholder="가격을 입력해주세요"
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                    />
                    {fieldErrors.price && <p className="mt-1 text-sm text-red-600">{fieldErrors.price}</p>}
                </div>

                {/* Content */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
                    <textarea
                        name="content"
                        value={form.content}
                        onChange={handleChange}
                        rows={10}
                        placeholder="게시글 내용을 입력해주세요"
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                    />
                    {fieldErrors.content && <p className="mt-1 text-sm text-red-600">{fieldErrors.content}</p>}
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
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                    >
                        {isSubmitting ? "등록 중..." : "등록완료"}
                    </button>
                </div>
            </form>
        </div>
    );
}

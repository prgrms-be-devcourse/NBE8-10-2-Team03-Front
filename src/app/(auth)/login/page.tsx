"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client";
import { useAuth } from "@/contexts/AuthProvider";

export default function LoginPage() {
    const router = useRouter();
    const { checkAuth } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setFieldErrors({});

        // Front-end validation
        const errors: Record<string, string> = {};
        if (!email) errors.email = "이메일을 입력해주세요.";
        if (!password) errors.password = "비밀번호를 입력해주세요.";

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setIsLoading(true);

        try {
            await api.post("/api/auth/login", { email, password });
            await checkAuth();
            router.push("/");
        } catch (e: any) {
            if (e instanceof ApiError && e.resultCode === "400-1") {
                const newFieldErrors: Record<string, string> = {};
                let otherMsg = "";

                e.msgLines.forEach((line) => {
                    const parts = line.split("-");
                    if (parts.length >= 3) {
                        const field = parts[0];
                        const msg = parts.slice(2).join("-");
                        newFieldErrors[field] = msg;
                    } else {
                        otherMsg += line + "\n";
                    }
                });

                if (Object.keys(newFieldErrors).length > 0) {
                    setFieldErrors(newFieldErrors);
                }
                if (otherMsg) {
                    setErrorMessage(otherMsg.trim());
                }
            } else if (e instanceof ApiError) {
                setErrorMessage(e.message);
            } else {
                setErrorMessage("로그인 중 오류가 발생했습니다.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
                        로그인
                    </h2>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4 rounded-md shadow-sm">
                        <div>
                            <label htmlFor="email-address" className="sr-only">
                                이메일
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="relative block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                                placeholder="이메일 주소"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            {fieldErrors.email && (
                                <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                비밀번호
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="relative block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                                placeholder="비밀번호"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            {fieldErrors.password && (
                                <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
                            )}
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="text-sm text-red-600 text-center whitespace-pre-wrap">
                            {errorMessage}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative flex w-full justify-center rounded-md bg-indigo-600 py-2 px-3 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-400"
                        >
                            {isLoading ? "로그인 중..." : "로그인"}
                        </button>
                    </div>

                    <div className="text-center">
                        <Link href="/signup" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                            회원가입하러 가기
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

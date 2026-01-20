"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client";

export default function SignupPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [nickname, setNickname] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Field-specific errors
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    // General error (network etc)
    const [generalError, setGeneralError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setGeneralError(null);

        // Frontend validation
        const newErrors: { [key: string]: string } = {};
        if (!email) newErrors.email = "이메일을 입력해주세요.";
        if (!nickname) newErrors.nickname = "닉네임을 입력해주세요.";
        if (!password) newErrors.password = "비밀번호를 입력해주세요.";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);

        try {
            await api.post("/api/auth/signup", { email, nickname, password });

            // Success -> Redirect to login
            router.push("/login");
        } catch (e: any) {
            if (e instanceof ApiError) {
                // Parse 400-1 msg lines
                const lines = e.msgLines;
                const fieldErrors: { [key: string]: string } = {};
                let otherMsg = "";

                lines.forEach((line) => {
                    // Format: field-code-message
                    const parts = line.split("-");
                    if (parts.length >= 3) {
                        const field = parts[0];
                        const msg = parts.slice(2).join("-");

                        if (["email", "nickname", "password"].includes(field)) {
                            fieldErrors[field] = msg;
                        } else {
                            otherMsg += line + "\n";
                        }
                    } else {
                        otherMsg += line + "\n";
                    }
                });

                if (Object.keys(fieldErrors).length > 0) {
                    setErrors(fieldErrors);
                }
                if (otherMsg) {
                    // If we have unparsed messages, show them generally
                    // Or if field errors exist, maybe just field errors are enough if otherMsg is empty
                    setGeneralError(otherMsg.trim());
                } else if (Object.keys(fieldErrors).length === 0) {
                    // If no field matched but we have lines, it means format didn't match expectation 
                    // or it's a general error
                    setGeneralError(e.message);
                }

            } else {
                setGeneralError("회원가입 중 오류가 발생했습니다.");
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
                        회원가입
                    </h2>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4 rounded-md shadow-sm">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                                이메일
                            </label>
                            <div className="mt-2">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="nickname" className="block text-sm font-medium leading-6 text-gray-900">
                                닉네임
                            </label>
                            <div className="mt-2">
                                <input
                                    id="nickname"
                                    name="nickname"
                                    type="text"
                                    required
                                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                />
                            </div>
                            {errors.nickname && (
                                <p className="mt-1 text-sm text-red-600">{errors.nickname}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
                                비밀번호
                            </label>
                            <div className="mt-2">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                            )}
                        </div>
                    </div>

                    {generalError && (
                        <div className="text-sm text-red-600 text-center whitespace-pre-wrap">
                            {generalError}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative flex w-full justify-center rounded-md bg-indigo-600 py-2 px-3 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-400"
                        >
                            {isLoading ? "회원가입 중..." : "회원가입"}
                        </button>
                    </div>

                    <div className="text-center">
                        <Link href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                            이미 계정이 있으신가요? 로그인
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

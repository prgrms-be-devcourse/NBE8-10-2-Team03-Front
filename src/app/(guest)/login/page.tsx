"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buildApiUrl, isSuccessResultCode, safeJson } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isKakaoLoading, setIsKakaoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setErrorMessage("아이디와 비밀번호를 입력해 주세요.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(buildApiUrl("/api/v1/members/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: trimmedUsername, password }),
      });
      const json = await safeJson<{
        resultCode?: string;
        msg?: string;
        data?: { apiKey?: string };
        apiKey?: string;
      }>(response);
      if (!json) {
        setErrorMessage("응답 파싱에 실패했습니다.");
        return;
      }
      if (json.resultCode) {
        const isSuccess =
          response.ok && isSuccessResultCode(json.resultCode);
        if (!isSuccess) {
          setErrorMessage(json.msg || "로그인에 실패했습니다.");
          return;
        }
      } else if (!response.ok) {
        setErrorMessage(json.msg || "로그인에 실패했습니다.");
        return;
      }
      const apiKey = json.data?.apiKey || json.apiKey;
      if (apiKey) {
        localStorage.setItem("buyerApiKey", apiKey);
      } else {
        localStorage.removeItem("buyerApiKey");
      }
      router.replace("/");
    } catch {
      setErrorMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = () => {
    setIsKakaoLoading(true);
    setErrorMessage(null);
    window.location.href = buildApiUrl("/oauth2/authorization/kakao");
  };

  return (
    <Card style={{ maxWidth: 420, margin: "40px auto 0" }}>
      <h1 style={{ marginTop: 0 }}>로그인</h1>
      <p className="muted">아이디와 비밀번호로 로그인하세요.</p>
      <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
        <div className="field">
          <label className="label" htmlFor="username">
            아이디
          </label>
          <input
            id="username"
            className="input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="username"
            autoComplete="username"
          />
        </div>
        <div className="field" style={{ marginTop: 16 }}>
          <label className="label" htmlFor="password">
            비밀번호
          </label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="password"
            autoComplete="current-password"
          />
        </div>
        {errorMessage ? (
          <ErrorMessage message={errorMessage} style={{ marginTop: 12 }} />
        ) : null}
        <button
          className="btn btn-primary"
          type="submit"
          disabled={isLoading}
          style={{ marginTop: 20, width: "100%" }}
        >
          {isLoading ? "로그인 중..." : "로그인"}
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={handleKakaoLogin}
          disabled={isKakaoLoading}
          style={{ marginTop: 12, width: "100%" }}
        >
          {isKakaoLoading ? "카카오 로그인 이동 중..." : "카카오로 로그인"}
        </button>
      </form>
      <div className="muted" style={{ marginTop: 16 }}>
        계정이 없나요? <Link href="/signup">회원가입</Link>
      </div>
    </Card>
  );
}

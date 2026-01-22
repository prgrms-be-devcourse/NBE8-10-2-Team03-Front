"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest, buildApiUrl } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isKakaoLoading, setIsKakaoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedUsername = username.trim();
    const trimmedNickname = nickname.trim();
    if (!trimmedUsername || !trimmedNickname || !password) {
      setErrorMessage("모든 필수 항목을 입력해 주세요.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { rsData, errorMessage: apiError, response } =
        await apiRequest<unknown>("/api/v1/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: trimmedUsername,
            password,
            nickname: trimmedNickname,
          }),
        });
      if (!response.ok || apiError || !rsData) {
        setErrorMessage(apiError || "회원가입에 실패했습니다.");
        return;
      }
      alert(rsData.msg || "회원가입이 완료되었습니다.");
      router.replace("/login");
    } catch {
      setErrorMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKakaoSignup = () => {
    setIsKakaoLoading(true);
    setErrorMessage(null);
    window.location.href = buildApiUrl("/oauth2/authorization/kakao");
  };

  return (
    <Card style={{ maxWidth: 460, margin: "40px auto 0" }}>
      <h1 style={{ marginTop: 0 }}>회원가입</h1>
      <p className="muted">새 계정을 만들어 서비스를 시작하세요.</p>
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
          <label className="label" htmlFor="nickname">
            닉네임
          </label>
          <input
            id="nickname"
            className="input"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="nickname"
            autoComplete="nickname"
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
            autoComplete="new-password"
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
          {isLoading ? "가입 중..." : "회원가입"}
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={handleKakaoSignup}
          disabled={isKakaoLoading}
          style={{ marginTop: 12, width: "100%" }}
        >
          {isKakaoLoading ? "카카오 가입 이동 중..." : "카카오로 시작하기"}
        </button>
      </form>
      <div className="muted" style={{ marginTop: 16 }}>
        이미 계정이 있나요? <Link href="/login">로그인</Link>
      </div>
    </Card>
  );
}

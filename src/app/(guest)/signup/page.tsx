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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(
    null
  );

  const validate = () => {
    const errors: Record<string, string> = {};
    const trimmedUsername = username.trim();
    const trimmedNickname = nickname.trim();

    if (!trimmedUsername) errors.username = "아이디는 필수입니다.";
    else if (trimmedUsername.length < 5 || trimmedUsername.length > 20) {
      errors.username = "아이디는 5-20자여야 합니다.";
    }

    if (!trimmedNickname) errors.nickname = "닉네임은 필수입니다.";
    else if (trimmedNickname.length < 2 || trimmedNickname.length > 30) {
      errors.nickname = "닉네임은 2자 이상 30자 이하로 입력해 주세요.";
    }

    if (!password) {
      errors.password = "비밀번호는 필수입니다.";
    } else {
      if (password.length < 8 || password.length > 20) {
        errors.password = "비밀번호는 8-20자여야 합니다.";
      }
      // 복잡성 체크: 영문 대문자, 소문자, 숫자, 특수문자 중 3종류 이상
      let complexity = 0;
      if (/[a-z]/.test(password)) complexity++;
      if (/[A-Z]/.test(password)) complexity++;
      if (/[0-9]/.test(password)) complexity++;
      if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) complexity++;

      if (complexity < 3) {
        errors.password =
          "비밀번호는 영문 대/소문자, 숫자, 특수문자 중 3가지 이상 조합이어야 합니다.";
      }

      // 연속된 문자/숫자 3개 이상 체크
      const consecutiveNumbers = [
        "012", "123", "234", "345", "456", "567", "678", "789", "890",
      ];
      if (consecutiveNumbers.some((seq) => password.includes(seq))) {
        errors.password = "연속된 문자 또는 숫자 3개 이상 사용할 수 없습니다.";
      }
      // 동일 문자 3번 이상 반복 체크
      if (/(.)\1\1/.test(password)) {
        errors.password = "동일한 문자를 3번 이상 연속 사용할 수 없습니다.";
      }

      if (trimmedUsername && password.toLowerCase().includes(trimmedUsername.toLowerCase())) {
        errors.password = "비밀번호에 아이디를 포함할 수 없습니다.";
      }
    }

    setFieldErrors(Object.keys(errors).length ? errors : null);
    return Object.keys(errors).length === 0;
  };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setFieldErrors(null);
    try {
      const { rsData, errorMessage: apiError, response } =
        await apiRequest<unknown>("/api/v1/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.trim(),
            password,
            nickname: nickname.trim(),
          }),
        });
      if (!response.ok || apiError || !rsData) {
        if (rsData?.resultCode === "400-1" && rsData.msg) {
          setErrorMessage(rsData.msg);
        } else {
          setErrorMessage(apiError || "회원가입에 실패했습니다.");
        }
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
    window.location.href = buildApiUrl(
      "/oauth2/authorization/kakao?redirectUrl=http://localhost:3000/"
    );
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
            placeholder="아이디 (5-20자)"
            autoComplete="username"
          />
          {fieldErrors?.username && (
            <span className="error">{fieldErrors.username}</span>
          )}
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
            placeholder="닉네임 (2-30자)"
            autoComplete="nickname"
          />
          {fieldErrors?.nickname && (
            <span className="error">{fieldErrors.nickname}</span>
          )}
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
            placeholder="8-20자, 영문 대/소문자, 숫자, 특수문자 중 3종 이상"
            autoComplete="new-password"
          />
          {fieldErrors?.password && (
            <span className="error">{fieldErrors.password}</span>
          )}
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

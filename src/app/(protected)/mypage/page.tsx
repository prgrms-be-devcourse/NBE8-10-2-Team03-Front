"use client";

import { useEffect, useState } from "react";
import { buildApiUrl, parseRsData, safeJson } from "@/lib/api";

type MemberMe = {
  id: number;
  username: string;
  name: string;
  score: number | null;
  createDate: string;
  modifyDate: string;
};

export default function MyPage() {
  const [me, setMe] = useState<MemberMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [nicknameSuccess, setNicknameSuccess] = useState<string | null>(null);
  const [isNicknameLoading, setIsNicknameLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchMe = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetch(buildApiUrl("/api/v1/members/me"), {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) {
          setErrorMessage("내 정보를 불러오지 못했습니다.");
          return;
        }
        const json = await safeJson<MemberMe>(response);
        if (!json) {
          setErrorMessage("응답 파싱에 실패했습니다.");
          return;
        }
        if (!isMounted) return;
        setMe(json);
      } catch {
        if (isMounted) {
          setErrorMessage("네트워크 오류가 발생했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    fetchMe();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (me) {
      setNickname(me.name);
    }
  }, [me]);

  const handleNicknameSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      setNicknameError("닉네임을 입력해 주세요.");
      setNicknameSuccess(null);
      return;
    }
    setIsNicknameLoading(true);
    setNicknameError(null);
    setNicknameSuccess(null);
    try {
      const response = await fetch(buildApiUrl("/api/v1/members/me/nickname"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nickname: trimmedNickname }),
      });
      const { rsData, errorMessage: apiError } =
        await parseRsData<unknown>(response);
      if (!response.ok || apiError || !rsData) {
        setNicknameError(apiError || "닉네임 수정에 실패했습니다.");
        return;
      }
      setMe((prev) => (prev ? { ...prev, name: trimmedNickname } : prev));
      setNicknameSuccess(rsData.msg || "닉네임이 수정되었습니다.");
    } catch {
      setNicknameError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsNicknameLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentPassword) {
      setPasswordError("현재 비밀번호를 입력해 주세요.");
      setPasswordSuccess(null);
      return;
    }
    if (!newPassword) {
      setPasswordError("새 비밀번호를 입력해 주세요.");
      setPasswordSuccess(null);
      return;
    }
    if (!confirmPassword) {
      setPasswordError("새 비밀번호 확인을 입력해 주세요.");
      setPasswordSuccess(null);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("비밀번호가 일치하지 않습니다.");
      setPasswordSuccess(null);
      return;
    }
    setIsPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    try {
      const response = await fetch(buildApiUrl("/api/v1/members/me/password"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          password: currentPassword,
          newPassword,
          checkPassword: confirmPassword,
        }),
      });
      const { rsData, errorMessage: apiError } =
        await parseRsData<unknown>(response);
      if (!response.ok || apiError || !rsData) {
        setPasswordError(apiError || "비밀번호 수정에 실패했습니다.");
        setPasswordSuccess(null);
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      setPasswordSuccess(rsData.msg || "비밀번호가 수정되었습니다.");
    } catch {
      setPasswordError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsPasswordLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="skeleton" style={{ width: "60%" }} />
        <div className="skeleton" style={{ width: "90%", marginTop: 12 }} />
      </div>
    );
  }

  if (errorMessage) {
    return <div className="error">{errorMessage}</div>;
  }

  if (!me) {
    return <div className="empty">사용자 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="page">
      <div className="grid-2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>프로필</h2>
          <div>
            <strong>{me.name}</strong> ({me.username})
          </div>
          <div className="muted" style={{ marginTop: 8 }}>
            가입일: {me.createDate}
          </div>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>점수</h2>
          <div style={{ fontSize: 32, fontWeight: 700 }}>
            {me.score === null ? "-" : me.score}
          </div>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>닉네임 수정</h2>
          <form onSubmit={handleNicknameSubmit}>
            <div className="field">
              <label className="label" htmlFor="nickname">
                닉네임
              </label>
              <input
                id="nickname"
                className="input"
                value={nickname}
                onChange={(event) => {
                  setNickname(event.target.value);
                  setNicknameError(null);
                  setNicknameSuccess(null);
                }}
                placeholder="nickname"
                autoComplete="nickname"
              />
            </div>
            {nicknameError ? (
              <div className="error" style={{ marginTop: 12 }}>
                {nicknameError}
              </div>
            ) : null}
            {nicknameSuccess ? (
              <div className="success" style={{ marginTop: 12 }}>
                {nicknameSuccess}
              </div>
            ) : null}
            <button
              className="btn btn-primary"
              type="submit"
              disabled={isNicknameLoading}
              style={{ marginTop: 16 }}
            >
              {isNicknameLoading ? "수정 중..." : "닉네임 변경"}
            </button>
          </form>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>비밀번호 수정</h2>
          <form onSubmit={handlePasswordSubmit}>
            <div className="field">
              <label className="label" htmlFor="current-password">
                현재 비밀번호
              </label>
              <input
                id="current-password"
                className="input"
                type="password"
                value={currentPassword}
                onChange={(event) => {
                  setCurrentPassword(event.target.value);
                  setPasswordError(null);
                  setPasswordSuccess(null);
                }}
                placeholder="current password"
                autoComplete="current-password"
                disabled={isPasswordLoading}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="new-password">
                새 비밀번호
              </label>
              <input
                id="new-password"
                className="input"
                type="password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setPasswordError(null);
                  setPasswordSuccess(null);
                }}
                placeholder="new password"
                autoComplete="new-password"
                disabled={isPasswordLoading}
              />
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label className="label" htmlFor="confirm-password">
                새 비밀번호 확인
              </label>
              <input
                id="confirm-password"
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setPasswordError(null);
                  setPasswordSuccess(null);
                }}
                placeholder="confirm new password"
                autoComplete="new-password"
                disabled={isPasswordLoading}
              />
            </div>
            {passwordError ? (
              <div className="error" style={{ marginTop: 12 }}>
                {passwordError}
              </div>
            ) : null}
            {passwordSuccess ? (
              <div className="success" style={{ marginTop: 12 }}>
                {passwordSuccess}
              </div>
            ) : null}
            <button
              className="btn btn-primary"
              type="submit"
              disabled={isPasswordLoading}
              style={{ marginTop: 16 }}
            >
              {isPasswordLoading ? "수정 중..." : "비밀번호 변경"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

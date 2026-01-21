"use client";

import { useEffect, useState } from "react";
import { buildApiUrl, safeJson } from "@/lib/api";

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
      </div>
    </div>
  );
}

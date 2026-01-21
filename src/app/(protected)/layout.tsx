"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthProvider, type MemberMe } from "@/components/auth/AuthContext";
import { buildApiUrl, parseRsData } from "@/lib/api";
import { fetchMe } from "@/lib/auth";

type AuthStatus = "checking" | "authed" | "guest";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [me, setMe] = useState<MemberMe | null>(null);
  const [globalErrorMessage, setGlobalErrorMessage] = useState<string | null>(
    null
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      const result = await fetchMe();
      if (!isMounted) return;
      if (result.ok && result.me) {
        setMe(result.me);
        setAuthStatus("authed");
        setGlobalErrorMessage(null);
      } else {
        setAuthStatus("guest");
        setGlobalErrorMessage(result.errorMessage);
      }
    };
    check();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (authStatus === "guest") {
      router.replace("/login");
    }
  }, [authStatus, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setGlobalErrorMessage(null);
    try {
      const response = await fetch(buildApiUrl("/api/v1/members/logout"), {
        method: "DELETE",
        credentials: "include",
      });
      const { rsData, errorMessage } = await parseRsData<null>(response);
      if (!response.ok || errorMessage || !rsData) {
        setGlobalErrorMessage(errorMessage || "로그아웃에 실패했습니다.");
        return;
      }
      localStorage.removeItem("buyerApiKey");
      setMe(null);
      setAuthStatus("guest");
      router.replace("/login");
    } catch {
      setGlobalErrorMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <AuthProvider me={me}>
      <div className="page">
        <header className="header">
          <div className="container header-inner">
            <Link className="logo" href="/">
              C2C MARKET
            </Link>
            <div className="actions">
              {authStatus === "checking" ? (
                <div className="skeleton" style={{ width: 140 }} />
              ) : (
                <span className="tag">
                  {me?.name || me?.username || "사용자"}
                </span>
              )}
              <button
                className="btn btn-ghost"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                로그아웃
              </button>
            </div>
          </div>
          {globalErrorMessage ? (
            <div className="container">
              <div className="error">{globalErrorMessage}</div>
            </div>
          ) : null}
        </header>
        {authStatus === "checking" ? (
          <main className="container">
            <div className="panel">
              <div className="skeleton" style={{ width: "40%" }} />
              <div className="skeleton" style={{ width: "70%", marginTop: 12 }} />
              <div className="skeleton" style={{ width: "60%", marginTop: 12 }} />
            </div>
          </main>
        ) : authStatus === "authed" ? (
          <main className="container fade-in">{children}</main>
        ) : null}
      </div>
    </AuthProvider>
  );
}

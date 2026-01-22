"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthProvider, type MemberMe } from "@/components/auth/AuthContext";
import { apiRequest } from "@/lib/api";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Panel } from "@/components/ui/Panel";
import { SkeletonLine } from "@/components/ui/SkeletonLine";
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
      const { rsData, errorMessage, response } =
        await apiRequest<null>("/api/v1/members/logout", { method: "DELETE" });
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
                <SkeletonLine width={140} />
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
              <ErrorMessage message={globalErrorMessage} />
            </div>
          ) : null}
        </header>
        {authStatus === "checking" ? (
          <main className="container">
            <Panel>
              <SkeletonLine width="40%" />
              <SkeletonLine width="70%" style={{ marginTop: 12 }} />
              <SkeletonLine width="60%" style={{ marginTop: 12 }} />
            </Panel>
          </main>
        ) : authStatus === "authed" ? (
          <main className="container fade-in">{children}</main>
        ) : null}
      </div>
    </AuthProvider>
  );
}

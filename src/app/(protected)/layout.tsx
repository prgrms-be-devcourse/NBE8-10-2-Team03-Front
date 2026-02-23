"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthProvider, type MemberMe } from "@/components/auth/AuthContext";
import { apiRequest, resolveImageUrl } from "@/lib/api";
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
  const pathname = usePathname();
  const routeKey = pathname ?? "protected-root";
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
      localStorage.removeItem("wsAccessToken");
      localStorage.removeItem("accessToken");
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
    <AuthProvider me={me} setMe={setMe}>
      <div className="page">
        <header className="header">
          <div className="container header-inner">
            <Link className="logo" href="/" style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "32px" }}>
              <img src="/logo.png" alt="고구마 로고" style={{ height: "40px", width: "auto" }} />
              <div>
                <div>고구마 마켓</div>
                <div className="brand-subtitle">이웃과 나누는 따뜻한 거래</div>
              </div>
            </Link>
            <div className="actions">
              {authStatus === "checking" ? (
                <SkeletonLine width={140} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      backgroundColor: "var(--bg-strong)",
                      overflow: "hidden",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={resolveImageUrl(me?.profileImgUrl)}
                      alt="프로필"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 600 }}>
                    {me?.name || me?.username || "사용자"}
                  </span>
                </div>
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
          <main className="container">
            <div key={routeKey} className="route-enter">
              {children}
            </div>
          </main>
        ) : null}
      </div>
    </AuthProvider>
  );
}

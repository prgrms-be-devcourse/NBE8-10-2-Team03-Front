"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, type MemberMe } from "@/components/auth/AuthContext";
import { resolveImageUrl } from "@/lib/api";

const noopSetMe = () => {};

export default function PublicShell({
  me,
  isCheckingAuth,
  children,
}: {
  me: MemberMe | null;
  isCheckingAuth: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPostsActive = pathname?.startsWith("/posts");
  const isAuctionsActive = pathname?.startsWith("/auctions");

  return (
    <AuthProvider me={me} setMe={noopSetMe}>
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
            <nav className="nav">
              <Link href="/posts" className={isPostsActive ? "nav-active" : ""}>
                중고거래
              </Link>
              <Link href="/auctions" className={isAuctionsActive ? "nav-active" : ""}>
                경매
              </Link>
            </nav>
            <div className="actions">
              {isCheckingAuth ? (
                <div className="skeleton" style={{ width: 120 }} />
              ) : me ? (
                <>
                  <Link href="/mypage" style={{ display: "flex", alignItems: "center", gap: "6px", textDecoration: "none", color: "inherit" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: "var(--bg-strong)",
                        overflow: "hidden",
                        border: "1px solid var(--border)",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={resolveImageUrl(me.profileImgUrl)}
                        alt="프로필"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: 600 }}>
                      {me.name || me.username || "마이페이지"}
                    </span>
                  </Link>
                  <Link className="btn btn-primary" href="/chat">
                    채팅
                  </Link>
                </>
              ) : (
                <>
                  <Link className="btn btn-ghost" href="/login">
                    로그인
                  </Link>
                  <Link className="btn btn-primary" href="/signup">
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="container fade-in">{children}</main>
      </div>
    </AuthProvider>
  );
}

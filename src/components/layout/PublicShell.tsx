"use client";

import Link from "next/link";
import { AuthProvider, type MemberMe } from "@/components/auth/AuthContext";

export default function PublicShell({
  me,
  isCheckingAuth,
  children,
}: {
  me: MemberMe | null;
  isCheckingAuth: boolean;
  children: React.ReactNode;
}) {
  return (
    <AuthProvider me={me}>
      <div className="page">
        <header className="header">
          <div className="container header-inner">
            <Link className="logo" href="/" style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "32px" }}>
              <img src="/logo.png" alt="고구마 로고" style={{ height: "40px", width: "auto" }} />
              고구마 마켓
            </Link>
            <nav className="nav">
              <Link href="/posts">중고거래</Link>
              <Link href="/auctions">경매</Link>
            </nav>
            <div className="actions">
              {isCheckingAuth ? (
                <div className="skeleton" style={{ width: 120 }} />
              ) : me ? (
                <>
                  <Link className="btn btn-ghost" href="/mypage">
                    마이페이지
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

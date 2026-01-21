"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buildApiUrl, parseRsData } from "@/lib/api";

type PostPreview = {
  id: number;
  title: string;
  price: number;
  categoryName: string;
  thumbnailUrl?: string;
  createDate: string;
};

type AuctionPreview = {
  auctionId: number;
  name: string;
  currentHighestBid: number;
  endAt: string;
  status: string;
  thumbnailUrl?: string;
};

export default function MainPage() {
  const [recentPosts, setRecentPosts] = useState<PostPreview[]>([]);
  const [openAuctions, setOpenAuctions] = useState<AuctionPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPreview = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [postsRes, auctionsRes] = await Promise.all([
          fetch(buildApiUrl("/api/v1/posts?page=0"), { credentials: "include" }),
          fetch(buildApiUrl("/api/auctions?status=OPEN&page=0&size=4"), {
            credentials: "include",
          }),
        ]);
        const postsParsed = await parseRsData<{
          content?: PostPreview[];
        }>(postsRes);
        const auctionsParsed = await parseRsData<{
          content?: AuctionPreview[];
        }>(auctionsRes);
        if (!isMounted) return;
        if (postsParsed.rsData && !postsParsed.errorMessage) {
          setRecentPosts(postsParsed.rsData.data?.content ?? []);
        } else {
          setRecentPosts([]);
        }
        if (auctionsParsed.rsData && !auctionsParsed.errorMessage) {
          setOpenAuctions(auctionsParsed.rsData.data?.content ?? []);
        } else {
          setOpenAuctions([]);
        }
        if (
          postsParsed.errorMessage &&
          auctionsParsed.errorMessage &&
          isMounted
        ) {
          setErrorMessage("미리보기 데이터를 불러오지 못했습니다.");
        }
      } catch {
        if (isMounted) {
          setErrorMessage("미리보기를 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    fetchPreview();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="page">
      <section className="panel">
        <h1 style={{ marginTop: 0 }}>오늘의 거래와 경매를 탐색해보세요</h1>
        <p className="muted">
          중고거래, 경매 핵심 경로를 빠르게 연결합니다.
        </p>
        <div className="grid-2" style={{ marginTop: 20 }}>
          <Link className="card" href="/posts">
            <h3 style={{ marginTop: 0 }}>중고거래 둘러보기</h3>
            <p className="muted">최신 등록 상품과 카테고리를 살펴보세요.</p>
          </Link>
          <Link className="card" href="/auctions">
            <h3 style={{ marginTop: 0 }}>경매 시작하기</h3>
            <p className="muted">진행 중인 경매와 종료 임박 상품을 확인합니다.</p>
          </Link>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <div className="grid-2">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>최신 중고거래</h2>
            {isLoading ? (
              <>
                <div className="skeleton" style={{ width: "60%" }} />
                <div className="skeleton" style={{ width: "80%", marginTop: 12 }} />
              </>
            ) : recentPosts.length === 0 ? (
              <div className="empty">표시할 중고거래가 없습니다.</div>
            ) : (
              <div className="grid-3">
                {recentPosts.slice(0, 3).map((post) => (
                  <Link key={post.id} className="panel" href={`/posts/${post.id}`}>
                    <div className="tag">{post.categoryName}</div>
                    <h4 style={{ margin: "12px 0 6px" }}>{post.title}</h4>
                    <div className="muted">{post.price.toLocaleString()}원</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>진행 중 경매</h2>
            {isLoading ? (
              <>
                <div className="skeleton" style={{ width: "60%" }} />
                <div className="skeleton" style={{ width: "80%", marginTop: 12 }} />
              </>
            ) : openAuctions.length === 0 ? (
              <div className="empty">진행 중 경매가 없습니다.</div>
            ) : (
              <div className="grid-3">
                {openAuctions.slice(0, 3).map((auction) => (
                  <Link
                    key={auction.auctionId}
                    className="panel"
                    href={`/auctions/${auction.auctionId}`}
                  >
                    <div className="tag">{auction.status}</div>
                    <h4 style={{ margin: "12px 0 6px" }}>{auction.name}</h4>
                    <div className="muted">
                      현재 최고가 {auction.currentHighestBid.toLocaleString()}원
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        {errorMessage ? (
          <div className="error" style={{ marginTop: 12 }}>
            {errorMessage}
          </div>
        ) : null}
      </section>
    </div>
  );
}

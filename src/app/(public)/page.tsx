"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, buildApiUrl } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SkeletonLine } from "@/components/ui/SkeletonLine";
import { getAuctionStatusLabel } from "@/lib/status";

type PostPreview = {
  id: number;
  title: string;
  price: number | null;
  categoryName: string;
  thumbnailUrl?: string;
  createDate: string;
};

type AuctionPreview = {
  auctionId: number;
  name: string;
  currentHighestBid: number | null;
  startPrice?: number | null;
  categoryName?: string;
  endAt: string;
  status: string;
  thumbnailUrl?: string;
};

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString();
};

const resolveImageUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return buildApiUrl(url);
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
        const [postsParsed, auctionsParsed] = await Promise.all([
          apiRequest<{ content?: PostPreview[] }>("/api/v1/posts?page=0"),
          apiRequest<{ content?: AuctionPreview[] }>(
            "/api/v1/auctions?status=OPEN&page=0&size=4"
          ),
        ]);
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
        <h1 style={{ marginTop: 0 }}>오늘의 거래와 경매를 한눈에</h1>
        <p className="muted">중고거래와 경매를 빠르게 살펴보세요.</p>
        <div className="grid-2" style={{ marginTop: 20 }}>
          <Link className="card" href="/posts">
            <h3 style={{ marginTop: 0 }}>중고거래 보기</h3>
            <p className="muted">최신 등록 상품을 바로 확인하세요.</p>
          </Link>
          <Link className="card" href="/auctions">
            <h3 style={{ marginTop: 0 }}>경매 둘러보기</h3>
            <p className="muted">지금 진행 중인 경매를 모았습니다.</p>
          </Link>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <div className="grid-2">
          <Card>
            <h2 style={{ marginTop: 0 }}>최신 중고거래</h2>
            {isLoading ? (
              <>
                <SkeletonLine width="60%" />
                <SkeletonLine width="80%" style={{ marginTop: 12 }} />
              </>
            ) : recentPosts.length === 0 ? (
              <EmptyState message="표시할 중고거래가 없습니다." />
            ) : (
              <div className="grid-3">
                {recentPosts.slice(0, 3).map((post) => (
                  <Link key={post.id} className="panel" href={`/posts/${post.id}`}>
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        marginBottom: 12,
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        display: "grid",
                        placeItems: "center",
                        color: "var(--muted)",
                        fontSize: 12,
                      }}
                    >
                      {resolveImageUrl(post.thumbnailUrl) ? (
                        <img
                          src={resolveImageUrl(post.thumbnailUrl) ?? ""}
                          alt={`${post.title} 썸네일`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "50% 50%",
                            display: "block",
                          }}
                        />
                      ) : (
                        "썸네일 없음"
                      )}
                    </div>
                    <div className="tag">{post.categoryName}</div>
                    <h4 style={{ margin: "12px 0 6px" }}>{post.title}</h4>
                    <div className="muted">{formatNumber(post.price)}원</div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <h2 style={{ marginTop: 0 }}>진행 중 경매</h2>
            {isLoading ? (
              <>
                <SkeletonLine width="60%" />
                <SkeletonLine width="80%" style={{ marginTop: 12 }} />
              </>
            ) : openAuctions.length === 0 ? (
              <EmptyState message="진행 중 경매가 없습니다." />
            ) : (
              <div className="grid-3">
                {openAuctions.slice(0, 3).map((auction) => (
                  <Link
                    key={auction.auctionId}
                    className="panel"
                    href={`/auctions/${auction.auctionId}`}
                  >
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        marginBottom: 12,
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        display: "grid",
                        placeItems: "center",
                        color: "var(--muted)",
                        fontSize: 12,
                      }}
                    >
                      {resolveImageUrl(auction.thumbnailUrl) ? (
                        <img
                          src={resolveImageUrl(auction.thumbnailUrl) ?? ""}
                          alt={`${auction.name} 썸네일`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "50% 50%",
                            display: "block",
                          }}
                        />
                      ) : (
                        "썸네일 없음"
                      )}
                    </div>
                    <div className="tag">
                      {auction.categoryName || "경매"}
                    </div>
                    <h4 style={{ margin: "12px 0 6px" }}>{auction.name}</h4>
                    <div className="muted">
                      현재 최고가{" "}
                      {formatNumber(
                        auction.currentHighestBid ?? auction.startPrice
                      )}
                      원
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
        {errorMessage ? (
          <ErrorMessage message={errorMessage} style={{ marginTop: 12 }} />
        ) : null}
      </section>
    </div>
  );
}

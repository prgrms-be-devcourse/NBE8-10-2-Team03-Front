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

const getAuctionStatusClassName = (status: string) => {
  switch (status) {
    case "OPEN":
      return "tag-status-open";
    case "COMPLETED":
      return "tag-status-completed";
    case "CLOSED":
      return "tag-status-closed";
    case "CANCELLED":
      return "tag-status-cancelled";
    default:
      return "tag-status-open";
  }
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
      <section className="panel hero">
        <div className="hero-eyebrow">고구마 마켓 추천</div>
        <h1 className="hero-title">따뜻한 이웃 거래, 오늘 바로 시작해 보세요</h1>
        <p className="hero-desc">
          우리 동네에서 필요한 물건을 나누고, 경매로 더 좋은 기회를 만나보세요.
        </p>
        <div className="hero-cta">
          <Link className="btn btn-primary" href="/posts">
            중고거래 시작하기
          </Link>
          <Link className="btn btn-ghost" href="/auctions">
            진행 중 경매 보기
          </Link>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <div className="grid-2">
          <Card className="market-card">
            <h2 style={{ marginTop: 0 }}>최신 중고거래</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              최근 등록된 따끈한 상품을 먼저 확인해 보세요.
            </p>
            {isLoading ? (
              <>
                <SkeletonLine width="60%" />
                <SkeletonLine width="80%" style={{ marginTop: 12 }} />
              </>
            ) : recentPosts.length === 0 ? (
              <EmptyState message="🧺 따끈한 상품 준비 중이에요. 잠시 후 다시 확인해 주세요." />
            ) : (
              <div className="grid-3">
                {recentPosts.slice(0, 3).map((post) => (
                  <Link key={post.id} className="panel market-card" href={`/posts/${post.id}`}>
                    <div className="thumb-frame">
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
                        <span className="thumb-empty">📦 따뜻한 상품 준비중</span>
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
          <Card className="market-card">
            <h2 style={{ marginTop: 0 }}>진행 중 경매</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              지금 참여 가능한 인기 경매를 빠르게 둘러보세요.
            </p>
            {isLoading ? (
              <>
                <SkeletonLine width="60%" />
                <SkeletonLine width="80%" style={{ marginTop: 12 }} />
              </>
            ) : openAuctions.length === 0 ? (
              <EmptyState message="🍠 진행 중인 경매가 아직 없어요. 곧 새로운 경매가 열릴 예정입니다." />
            ) : (
              <div className="grid-3">
                {openAuctions.slice(0, 3).map((auction) => (
                  <Link
                    key={auction.auctionId}
                    className="panel market-card"
                    href={`/auctions/${auction.auctionId}`}
                  >
                    <div className="thumb-frame">
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
                        <span className="thumb-empty">🔥 입찰 준비 중</span>
                      )}
                    </div>
                    <div className={`tag tag-status ${getAuctionStatusClassName(auction.status)}`}>
                      {getAuctionStatusLabel(auction.status)}
                    </div>
                    <h4 style={{ margin: "12px 0 6px" }}>{auction.name}</h4>
                    <div className="muted" style={{ marginBottom: 4 }}>
                      카테고리: {auction.categoryName || "경매"}
                    </div>
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

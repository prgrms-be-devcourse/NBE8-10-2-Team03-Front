"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { apiRequest, buildApiUrl } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SkeletonLine } from "@/components/ui/SkeletonLine";
import { getAuctionStatusLabel } from "@/lib/status";
import { CATEGORIES } from "@/lib/categories";
import { formatDateTime } from "@/lib/datetime";

type AuctionItem = {
  auctionId: number;
  name: string;
  thumbnailUrl?: string;
  startPrice: number;
  currentHighestBid: number | null;
  buyNowPrice?: number;
  status: string;
  endAt: string;
  bidCount: number;
  seller?: {
    id: number;
    nickname: string;
    reputationScore: number;
  };
  sellerNickname?: string;
  sellerBadge?: string;
  categoryName?: string;
};

type AuctionPageData = {
  content?: AuctionItem[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
};

type SearchItem = {
  id: number;
  type?: string;
  title: string;
  price: number | null;
  status?: string;
  categoryName?: string;
  thumbnailUrl?: string;
  createDate: string;
  sellerNickname?: string;
  sellerBadge?: string;
};

type SearchResponse = {
  content?: SearchItem[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
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

export default function AuctionsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");
  const [categoryInput, setCategoryInput] = useState("");
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [sort, setSort] = useState("LATEST");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [pageData, setPageData] = useState<AuctionPageData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("size", String(size));
    if (status && status !== "all") params.set("status", status);
    if (categoryName) {
      params.set("category", categoryName);
    } else if (categoryInput.trim()) {
      params.set("category", categoryInput.trim());
    }
    if (sort === "LATEST") {
      params.set("sort", "createDate,desc");
    } else if (sort === "OLDEST") {
      params.set("sort", "createDate,asc");
    }
    return params.toString();
  };

  useEffect(() => {
    let isMounted = true;
    const fetchAuctions = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("size", String(size));
        if (sort === "LATEST") {
          params.set("sort", "createDate,desc");
        } else if (sort === "OLDEST") {
          params.set("sort", "createDate,asc");
        }
        const endpoint = keyword
          ? `/api/v1/search?keyword=${encodeURIComponent(keyword)}&${params.toString()}`
          : `/api/v1/auctions?${buildQuery()}`;
        const { rsData, errorMessage: apiError, response } = keyword
          ? await apiRequest<SearchResponse>(endpoint)
          : await apiRequest<AuctionPageData>(endpoint);
        if (!isMounted) return;
        if (!response.ok || apiError || !rsData) {
          setAuctions([]);
          setPageData(null);
          setErrorMessage(apiError || "목록을 불러오지 못했습니다.");
          return;
        }
        if (keyword) {
          const content =
            (rsData as { data?: SearchResponse }).data?.content ?? [];
          const filtered = content.filter(
            (item) => !item.type || item.type === "AUCTION"
          );
          setAuctions(
            filtered.map((item) => ({
              auctionId: item.id,
              name: item.title,
              thumbnailUrl: item.thumbnailUrl,
              startPrice: item.price ?? 0,
              currentHighestBid: item.price ?? null,
              status: item.status ?? "OPEN",
              endAt: item.createDate,
              bidCount: 0,
              sellerNickname: item.sellerNickname,
              sellerBadge: item.sellerBadge,
              categoryName: item.categoryName,
            }))
          );
          setPageData({
            page: (rsData as { data?: SearchResponse }).data?.page || page,
            size: (rsData as { data?: SearchResponse }).data?.size || size,
            totalElements:
              (rsData as { data?: SearchResponse }).data?.totalElements || 0,
            totalPages:
              (rsData as { data?: SearchResponse }).data?.totalPages || 0,
          });
        } else {
          const data = (rsData as { data?: AuctionPageData }).data;
          setAuctions(data?.content || []);
          setPageData({
            page: data?.page || page,
            size: data?.size || size,
            totalElements: data?.totalElements || 0,
            totalPages: data?.totalPages || 0,
          });
        }
      } catch {
        if (isMounted) {
          setAuctions([]);
          setPageData(null);
          setErrorMessage("네트워크 오류가 발생했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    fetchAuctions();
    return () => {
      isMounted = false;
    };
  }, [status, categoryName, categoryInput, sort, page, size, keyword]);

  const handleWrite = () => {
    if (auth?.me) {
      router.push("/auctions/write");
      return;
    }
    router.push("/login");
  };

  const applySearch = () => {
    setKeyword(keywordInput.trim());
    setPage(0);
  };

  const resetFilters = () => {
    setKeywordInput("");
    setKeyword("");
    setStatus("all");
    setCategoryInput("");
    setCategoryName(null);
    setPage(0);
  };

  return (
    <div className="page">
      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "220px 1fr" }}>
        <aside className="panel" style={{ alignSelf: "start" }}>
          <h2 style={{ marginTop: 0 }}>카테고리</h2>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            <button
              className="card"
              style={{
                textAlign: "left",
                border:
                  categoryName === null
                    ? "2px solid var(--accent)"
                    : "1px solid var(--border)",
              }}
              onClick={() => {
                setCategoryName(null);
                setCategoryInput("");
                setPage(0);
              }}
            >
              전체
            </button>
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                className="card"
                style={{
                  textAlign: "left",
                  border:
                    categoryName === item.name
                      ? "2px solid var(--accent)"
                      : "1px solid var(--border)",
                }}
                onClick={() => {
                  setCategoryName(item.name);
                  setCategoryInput(item.name);
                  setPage(0);
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
        </aside>
        <div>
          <section className="panel">
            <h1 style={{ marginTop: 0 }}>경매 목록</h1>
            <div className="field-row" style={{ marginTop: 16 }}>
              <div className="field">
                <label className="label" htmlFor="keyword">
                  검색어
                </label>
                <input
                  id="keyword"
                  className="input"
                  value={keywordInput}
                  onChange={(event) => setKeywordInput(event.target.value)}
                  placeholder="경매명/경매내용으로 검색"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applySearch();
                  }}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="status">
                  상태
                </label>
                <select
                  id="status"
                  className="select"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="all">전체</option>
                  <option value="OPEN">진행 중</option>
                  <option value="CLOSED">입찰 없음</option>
                  <option value="COMPLETED">낙찰 완료</option>
                  <option value="CANCELLED">취소됨</option>
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="category">
                  카테고리
                </label>
                <input
                  id="category"
                  className="input"
                  value={categoryInput}
                  onChange={(event) => {
                    setCategoryInput(event.target.value);
                    setCategoryName(null);
                  }}
                  placeholder="카테고리 입력"
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="sort">
                  정렬
                </label>
                <select
                  id="sort"
                  className="select"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="LATEST">최신순</option>
                  <option value="OLDEST">오래된순</option>
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="size">
                  페이지 크기
                </label>
                <input
                  id="size"
                  className="input"
                  type="number"
                  min={1}
                  value={size}
                  onChange={(event) => setSize(Number(event.target.value) || 20)}
                />
              </div>
            </div>
            <div className="actions" style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={applySearch}>
                검색 적용
              </button>
              <button className="btn btn-primary" onClick={handleWrite}>
                경매 등록
              </button>
              <button className="btn btn-ghost" onClick={resetFilters}>
                필터 초기화
              </button>
            </div>
          </section>

          <section style={{ marginTop: 24 }}>
            {isLoading ? (
              <Card>
                <SkeletonLine width="70%" />
                <SkeletonLine width="90%" style={{ marginTop: 12 }} />
              </Card>
            ) : errorMessage ? (
              <ErrorMessage message={errorMessage} />
            ) : auctions.length === 0 ? (
              <EmptyState message="표시할 경매가 없습니다." />
            ) : (
              <div className="grid-3">
                {auctions.map((auction) => (
                  <Link
                    key={auction.auctionId}
                    className="card"
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
                    <div className="tag">{auction.categoryName || "경매"}</div>
                    <h3 style={{ margin: "12px 0 6px" }}>{auction.name}</h3>
                    <div className="muted">
                      {formatNumber(
                        auction.currentHighestBid ?? auction.startPrice
                      )}
                      원 · {getAuctionStatusLabel(auction.status)}
                    </div>
                    <div className="muted" style={{ marginTop: 4 }}>
                      {formatDateTime(auction.endAt)}
                    </div>
                    <div className="muted" style={{ marginTop: 6 }}>
                      입찰 {formatNumber(auction.bidCount)}건 · 판매자{" "}
                      {auction.seller?.nickname || auction.sellerNickname || "-"}
                    </div>
                    {auction.sellerBadge ? (
                      <div className="tag" style={{ marginTop: 8 }}>
                        {auction.sellerBadge}
                      </div>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
            {pageData ? (
              <div className="actions" style={{ marginTop: 16 }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                  disabled={page <= 0}
                >
                  이전
                </button>
                <span className="muted">
                  {page + 1} / {pageData.totalPages} (총 {pageData.totalElements}건)
                </span>
                <button
                  className="btn btn-ghost"
                  onClick={() =>
                    setPage((prev) =>
                      pageData.totalPages
                        ? Math.min(prev + 1, pageData.totalPages - 1)
                        : prev + 1
                    )
                  }
                  disabled={pageData.totalPages > 0 && page >= pageData.totalPages - 1}
                >
                  다음
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}





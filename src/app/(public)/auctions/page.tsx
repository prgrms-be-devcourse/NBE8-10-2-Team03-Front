"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { apiRequest } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SkeletonLine } from "@/components/ui/SkeletonLine";
import { getAuctionStatusLabel } from "@/lib/status";

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
  categoryName?: string;
};

type AuctionPageData = {
  content?: AuctionItem[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
};

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString();
};

export default function AuctionsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [status, setStatus] = useState("OPEN");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("");
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
    if (status) params.set("status", status);
    if (category.trim()) params.set("category", category.trim());
    if (sort.trim()) params.set("sort", sort.trim());
    return params.toString();
  };

  useEffect(() => {
    let isMounted = true;
    const fetchAuctions = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const { rsData, errorMessage: apiError, response } =
          await apiRequest<AuctionPageData>(`/api/auctions?${buildQuery()}`);
        if (!isMounted) return;
        if (!response.ok || apiError || !rsData) {
          setAuctions([]);
          setPageData(null);
          setErrorMessage(apiError || "목록을 불러오지 못했습니다.");
          return;
        }
        setAuctions(rsData.data?.content ?? []);
        setPageData({
          page: rsData.data?.page ?? page,
          size: rsData.data?.size ?? size,
          totalElements: rsData.data?.totalElements ?? 0,
          totalPages: rsData.data?.totalPages ?? 0,
        });
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
  }, [status, category, sort, page, size]);

  const handleWrite = () => {
    if (auth?.me) {
      router.push("/auctions/write");
      return;
    }
    router.push("/login");
  };

  return (
    <div className="page">
      <section className="panel">
        <h1 style={{ marginTop: 0 }}>경매 목록</h1>
        <div className="field-row" style={{ marginTop: 16 }}>
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
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="카테고리 문자열"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="sort">
              정렬
            </label>
            <input
              id="sort"
              className="input"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              placeholder="예: endAt,desc"
            />
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
          <button className="btn btn-primary" onClick={handleWrite}>
            경매 등록
          </button>
          <button className="btn btn-ghost" onClick={() => setPage(0)}>
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
                <div className="tag">
                  {getAuctionStatusLabel(auction.status)}
                </div>
                <h3 style={{ margin: "12px 0 6px" }}>{auction.name}</h3>
                <div className="muted">
                  현재가 {formatNumber(auction.currentHighestBid)}원
                </div>
                <div className="muted">
                  종료 {auction.endAt} · 입찰 {auction.bidCount}회
                </div>
                {auction.categoryName ? (
                  <div className="tag" style={{ marginTop: 8 }}>
                    {auction.categoryName}
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
  );
}

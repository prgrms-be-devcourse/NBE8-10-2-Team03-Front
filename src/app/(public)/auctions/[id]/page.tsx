"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildApiUrl, parseRsData } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthContext";

type AuctionDetail = {
  auctionId: number;
  name: string;
  description: string;
  startPrice: number | null;
  currentHighestBid: number | null;
  buyNowPrice?: number | null;
  bidCount: number;
  status: string;
  startAt: string;
  endAt: string;
  imageUrls: string[];
  seller: {
    id: number;
    nickname: string;
    reputationScore: number;
  };
  categoryName?: string;
};

type BidItem = {
  bidId: number;
  bidderId: number;
  bidderNickname: string;
  price: number;
  createdAt: string;
};

type BidPageData = {
  content?: BidItem[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
};

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString();
};

const resolveImageUrl = (url: string) => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return buildApiUrl(url);
};

export default function AuctionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const auth = useAuth();
  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [isBidSubmitting, setIsBidSubmitting] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);
  const [bidPage, setBidPage] = useState(0);
  const [bids, setBids] = useState<BidItem[]>([]);
  const [bidsPageData, setBidsPageData] = useState<BidPageData | null>(null);
  const [isBidsLoading, setIsBidsLoading] = useState(false);
  const [bidsError, setBidsError] = useState<string | null>(null);
  const bidPageSize = 10;
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  const auctionId = useMemo(() => {
    const raw = params?.id;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value ? Number(value) : null;
  }, [params]);

  const loadAuctionDetail = useCallback(async () => {
    if (!auctionId) {
      setErrorMessage("잘못된 접근입니다.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(buildApiUrl(`/api/auctions/${auctionId}`));
      const { rsData, errorMessage: apiError } =
        await parseRsData<AuctionDetail>(response);
      if (!response.ok || apiError || !rsData) {
        setAuction(null);
        if (response.status === 404) {
          setErrorMessage("존재하지 않는 경매입니다.");
        } else {
          setErrorMessage(apiError || "상세 정보를 불러오지 못했습니다.");
        }
        return;
      }
      setAuction(rsData.data);
    } catch {
      setErrorMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    const run = async () => {
      await loadAuctionDetail();
    };
    run();
  }, [loadAuctionDetail]);

  const loadBids = useCallback(async () => {
    if (!auctionId) return;
    setIsBidsLoading(true);
    setBidsError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(bidPage));
      params.set("size", String(bidPageSize));
      const response = await fetch(
        buildApiUrl(`/api/auctions/${auctionId}/bids?${params.toString()}`)
      );
      const { rsData, errorMessage: apiError } =
        await parseRsData<BidPageData>(response);
      if (!response.ok || apiError || !rsData) {
        setBids([]);
        setBidsPageData(null);
        setBidsError(apiError || "입찰 내역을 불러오지 못했습니다.");
        return;
      }
      setBids(rsData.data?.content ?? []);
      setBidsPageData({
        page: rsData.data?.page ?? bidPage,
        size: rsData.data?.size ?? bidPageSize,
        totalElements: rsData.data?.totalElements ?? 0,
        totalPages: rsData.data?.totalPages ?? 0,
      });
    } catch {
      setBids([]);
      setBidsPageData(null);
      setBidsError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsBidsLoading(false);
    }
  }, [auctionId, bidPage, bidPageSize]);

  useEffect(() => {
    loadBids();
  }, [loadBids]);

  useEffect(() => {
    if (!auction) return;
    if (auction.currentHighestBid !== null && auction.currentHighestBid !== undefined) {
      const current = auction.currentHighestBid;
      const suggested = Math.min(current + 1000, Math.floor(current * 1.5));
      setBidAmount(String(suggested));
      return;
    }
    if (auction.startPrice !== null && auction.startPrice !== undefined) {
      setBidAmount(String(auction.startPrice));
    }
  }, [auction]);

  const handleBidSubmit = async () => {
    if (!auctionId || isBidSubmitting) return;
    const price = Number(bidAmount);
    if (!Number.isFinite(price) || price <= 0) {
      setBidError("올바른 입찰가를 입력하세요.");
      return;
    }
    setIsBidSubmitting(true);
    setBidError(null);
    setBidSuccess(null);
    try {
      const response = await fetch(
        buildApiUrl(`/api/auctions/${auctionId}/bids`),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ price }),
        }
      );
      const { rsData, errorMessage: apiError } =
        await parseRsData<{ bidId: number }>(response);
      if (!response.ok || apiError || !rsData) {
        setBidError(apiError || "입찰에 실패했습니다.");
        return;
      }
      setBidSuccess(rsData.msg || "입찰에 성공했습니다.");
      await loadAuctionDetail();
      await loadBids();
    } catch {
      setBidError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsBidSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!auctionId || isDeleting) return;
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(buildApiUrl(`/api/auctions/${auctionId}`), {
        method: "DELETE",
        credentials: "include",
      });
      const { rsData, errorMessage: apiError } =
        await parseRsData<{ message?: string }>(response);
      if (!response.ok || apiError || !rsData) {
        setDeleteError(apiError || "삭제에 실패했습니다.");
        return;
      }
      router.push("/auctions");
    } catch {
      setDeleteError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReportSeller = async () => {
    if (!auction || isReporting) return;
    if (!confirm("판매자를 신고하시겠습니까?")) return;
    setIsReporting(true);
    setReportError(null);
    setReportSuccess(null);
    try {
      const response = await fetch(
        buildApiUrl(`/api/v1/members/${auction.seller.id}/credit`),
        {
          method: "PATCH",
          credentials: "include",
        }
      );
      const { rsData, errorMessage: apiError } =
        await parseRsData<null>(response);
      if (!response.ok || apiError || !rsData) {
        setReportError(apiError || "신고에 실패했습니다.");
        return;
      }
      setReportSuccess(rsData.msg || "신고가 접수되었습니다.");
    } catch {
      setReportError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsReporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="skeleton" style={{ width: "60%" }} />
        <div className="skeleton" style={{ width: "90%", marginTop: 12 }} />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="card">
        <div className="error">{errorMessage}</div>
        <div className="actions" style={{ marginTop: 16 }}>
          <Link className="btn btn-ghost" href="/auctions">
            목록으로 이동
          </Link>
        </div>
      </div>
    );
  }

  if (!auction) {
    return <div className="empty">경매 정보를 찾을 수 없습니다.</div>;
  }

  const isSeller = auth?.me?.id === auction.seller.id;
  const isAuctionOpen = auction.status === "OPEN";
  const isEditable =
    isSeller &&
    (auction.bidCount === 0 ||
      auction.currentHighestBid === null ||
      auction.currentHighestBid === undefined);
  const canDelete =
    isSeller &&
    (auction.bidCount === 0 ||
      auction.currentHighestBid === null ||
      auction.currentHighestBid === undefined);

  return (
    <div className="page">
      <section className="grid-2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>이미지</h2>
          {auction.imageUrls?.length ? (
            <div className="grid-2">
              {auction.imageUrls.map((url, index) => {
                const resolvedUrl = resolveImageUrl(url);
                return (
                  <div key={`${url}-${index}`} className="panel">
                    <img
                      alt={`경매 이미지 ${index + 1}`}
                      src={resolvedUrl}
                      style={{ width: "100%", borderRadius: 12 }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty">등록된 이미지가 없습니다.</div>
          )}
        </div>
        <div className="card">
          <div className="tag">{auction.status}</div>
          <h1 style={{ marginTop: 8 }}>{auction.name}</h1>
          <p>{auction.description}</p>
          <div className="muted">
            시작가 {formatNumber(auction.startPrice)}원 · 현재가{" "}
            {formatNumber(auction.currentHighestBid)}원
          </div>
          {auction.buyNowPrice !== null && auction.buyNowPrice !== undefined ? (
            <div className="muted">즉시구매 {formatNumber(auction.buyNowPrice)}원</div>
          ) : null}
          <div className="muted">
            입찰 {auction.bidCount}회 · 시작 {auction.startAt} · 종료{" "}
            {auction.endAt}
          </div>
          {!isSeller ? (
            <div className="panel" style={{ marginTop: 16 }}>
              <div className="field">
                <label className="label" htmlFor="bidAmount">
                  입찰가
                </label>
                <input
                  id="bidAmount"
                  className="input"
                  type="number"
                  min={0}
                  step={1000}
                  value={bidAmount}
                  onChange={(event) => setBidAmount(event.target.value)}
                />
              </div>
              {bidError ? (
                <div className="error" style={{ marginTop: 8 }}>
                  {bidError}
                </div>
              ) : null}
              {bidSuccess ? (
                <div className="tag" style={{ marginTop: 8 }}>
                  {bidSuccess}
                </div>
              ) : null}
              <div className="actions" style={{ marginTop: 12 }}>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={handleBidSubmit}
                  disabled={isBidSubmitting || !isAuctionOpen}
                >
                  {isBidSubmitting ? "입찰 중..." : "입찰하기"}
                </button>
              </div>
              {!isAuctionOpen ? (
                <div className="muted" style={{ marginTop: 8 }}>
                  종료된 경매에는 입찰할 수 없습니다.
                </div>
              ) : null}
            </div>
          ) : null}
          {isSeller ? (
            <div className="panel" style={{ marginTop: 16 }}>
              <div className="actions">
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => router.push(`/auctions/${auction.auctionId}/edit`)}
                  disabled={!isEditable}
                >
                  수정
                </button>
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || !canDelete}
                >
                  {isDeleting ? "삭제 중..." : "삭제"}
                </button>
              </div>
              {deleteError ? (
                <div className="error" style={{ marginTop: 8 }}>
                  {deleteError}
                </div>
              ) : null}
              {!canDelete ? (
                <div className="muted" style={{ marginTop: 8 }}>
                  입찰이 있으면 삭제할 수 없습니다.
                </div>
              ) : null}
              {!isEditable ? (
                <div className="muted" style={{ marginTop: 8 }}>
                  입찰이 없을 때만 수정할 수 있습니다.
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="panel" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>입찰 내역</h3>
            {isBidsLoading ? (
              <>
                <div className="skeleton" style={{ width: "60%" }} />
                <div className="skeleton" style={{ width: "80%", marginTop: 8 }} />
              </>
            ) : bidsError ? (
              <div className="error">{bidsError}</div>
            ) : bids.length === 0 ? (
              <div className="empty">입찰 내역이 없습니다.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {bids.map((bid) => (
                  <div key={bid.bidId}>
                    <div className="muted">
                      {bid.bidderNickname} · {bid.createdAt}
                    </div>
                    <div>{formatNumber(bid.price)}원</div>
                  </div>
                ))}
              </div>
            )}
            {bidsPageData ? (
              <div className="actions" style={{ marginTop: 12 }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setBidPage((prev) => Math.max(prev - 1, 0))}
                  disabled={bidPage <= 0}
                >
                  이전
                </button>
                <span className="muted">
                  {bidPage + 1} / {bidsPageData.totalPages} (총{" "}
                  {bidsPageData.totalElements}건)
                </span>
                <button
                  className="btn btn-ghost"
                  onClick={() =>
                    setBidPage((prev) =>
                      bidsPageData.totalPages
                        ? Math.min(prev + 1, bidsPageData.totalPages - 1)
                        : prev + 1
                    )
                  }
                  disabled={
                    bidsPageData.totalPages > 0 &&
                    bidPage >= bidsPageData.totalPages - 1
                  }
                >
                  다음
                </button>
              </div>
            ) : null}
          </div>
          {auction.categoryName ? (
            <div className="tag" style={{ marginTop: 8 }}>
              {auction.categoryName}
            </div>
          ) : null}
          <div style={{ marginTop: 16 }}>
            판매자: <strong>{auction.seller.nickname}</strong> (평판{" "}
            {auction.seller.reputationScore})
          </div>
          {!isSeller ? (
            <div className="panel" style={{ marginTop: 16 }}>
              <div className="actions">
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={handleReportSeller}
                  disabled={isReporting}
                >
                  {isReporting ? "신고 중..." : "판매자 신고"}
                </button>
              </div>
              {reportError ? (
                <div className="error" style={{ marginTop: 8 }}>
                  {reportError}
                </div>
              ) : null}
              {reportSuccess ? (
                <div className="success" style={{ marginTop: 8 }}>
                  {reportSuccess}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="panel" style={{ marginTop: 16 }}>
            {auction.status === "OPEN"
              ? "진행 중인 경매입니다. 새로고침으로 최신 상태를 확인하세요."
              : "종료된 경매입니다."}
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiRequest,
  buildApiUrl,
  isSuccessResultCode,
  safeJson,
} from "@/lib/api";
import { useAuth } from "@/components/auth/AuthContext";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Panel } from "@/components/ui/Panel";
import { SkeletonLine } from "@/components/ui/SkeletonLine";
import { getAuctionStatusLabel } from "@/lib/status";

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
  winnerId?: number | null;
  winningBidId?: number | null;
  closedAt?: string | null;
  cancelledBy?: number | null;
  cancellerRole?: "SELLER" | "BUYER" | null;
  cancellerRoleDescription?: string | null;
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
  const [isReporting, setIsReporting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const auctionId = useMemo(() => {
    const raw = params?.id;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value ? Number(value) : null;
  }, [params]);
  const winningBid = useMemo(() => {
    const winningBidId = auction?.winningBidId;
    if (!winningBidId) return null;
    return bids.find((bid) => bid.bidId === winningBidId) || null;
  }, [auction?.winningBidId, bids]);

  const loadAuctionDetail = useCallback(async () => {
    if (!auctionId) {
      setErrorMessage("잘못된 접근입니다.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { rsData, errorMessage: apiError, response } =
        await apiRequest<AuctionDetail>(`/api/auctions/${auctionId}`);
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
      const { rsData, errorMessage: apiError, response } =
        await apiRequest<BidPageData>(
          `/api/auctions/${auctionId}/bids?${params.toString()}`
        );
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
      const { rsData, errorMessage: apiError, response } =
        await apiRequest<{ bidId: number }>(`/api/auctions/${auctionId}/bids`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ price }),
        });
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

  const handleReportSeller = async () => {
    if (!auction || isReporting) return;
    if (!confirm("판매자를 신고하시겠습니까?")) return;
    setIsReporting(true);
    setReportError(null);
    setReportSuccess(null);
    try {
      const { rsData, errorMessage: apiError, response } =
        await apiRequest<null>(`/api/v1/members/${auction.seller.id}/credit`, {
          method: "PATCH",
        });
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

  const handleCancelTrade = async () => {
    if (!auctionId || isCanceling) return;
    if (!confirm("정말 취소하시겠습니까?")) return;
    setIsCanceling(true);
    setCancelError(null);
    setCancelSuccess(null);
    try {
      const { rsData, errorMessage: apiError, response } =
        await apiRequest<null>(`/api/auctions/${auctionId}/cancel`, {
          method: "POST",
        });
      if (!response.ok || apiError || !rsData) {
      setCancelError(apiError || "취소에 실패했습니다.");
      return;
    }
      setCancelSuccess(rsData.msg || "취소되었습니다.");
      await loadAuctionDetail();
    } catch {
      setCancelError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsCanceling(false);
    }
  };

  const handleChat = async () => {
    if (!auth?.me) {
      router.push("/login");
      return;
    }
    if (!auctionId || !auction) return;
    if (isCreatingChat) return;
    setIsCreatingChat(true);
    setChatError(null);
    const storedApiKey =
      typeof window !== "undefined"
        ? localStorage.getItem("buyerApiKey")
        : null;
    const buyerApiKey = isSeller
      ? auction.winnerId
        ? `${auction.winnerId}`
        : null
      : storedApiKey ||
        auth.me.apiKey ||
        auth.me.username ||
        auth.me.name ||
        `${auth.me.id}`;
    if (!buyerApiKey) {
      setChatError("낙찰자 정보가 없어 채팅을 시작할 수 없습니다.");
      setIsCreatingChat(false);
      return;
    }
    const query = new URLSearchParams({
      itemId: `${auctionId}`,
      txType: "AUCTION",
      buyerApiKey,
    });
    try {
      const response = await fetch(
        buildApiUrl(`/api/chat/room?${query.toString()}`),
        {
          method: "POST",
          credentials: "include",
        }
      );
      const json = await safeJson<{
        resultCode?: string;
        msg?: string;
        data?: { roomId?: string };
        roomId?: string;
      }>(response);
      let roomId = "";
      if (json) {
        if (json.resultCode) {
          const isSuccess =
            response.ok && isSuccessResultCode(json.resultCode);
          if (!isSuccess) {
            setChatError(json.msg || "채팅방 생성에 실패했습니다.");
            return;
          }
        } else if (!response.ok) {
          setChatError(json.msg || "채팅방 생성에 실패했습니다.");
          return;
        }
        roomId = json.data?.roomId || json.roomId || "";
      } else {
        const text = await response.text();
        if (!response.ok) {
          setChatError(text || "채팅방 생성에 실패했습니다.");
          return;
        }
        roomId = text.trim();
      }
      if (!roomId) {
        setChatError("채팅방 정보를 받지 못했습니다.");
        return;
      }
      router.push(
        `/chat?roomId=${encodeURIComponent(roomId)}&itemId=${auctionId}`
      );
    } catch {
      setChatError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsCreatingChat(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <SkeletonLine width="60%" />
        <SkeletonLine width="90%" style={{ marginTop: 12 }} />
      </Card>
    );
  }

  if (errorMessage) {
    return (
      <Card>
        <ErrorMessage message={errorMessage} />
        <div className="actions" style={{ marginTop: 16 }}>
          <Link className="btn btn-ghost" href="/auctions">
            목록으로 이동
          </Link>
        </div>
      </Card>
    );
  }

  if (!auction) {
    return <EmptyState message="경매 정보를 찾을 수 없습니다." />;
  }

  const isSeller = auth?.me?.id === auction.seller.id;
  const isWinner = auth?.me?.id === auction.winnerId;
  const isAuctionOpen = auction.status === "OPEN";
  const isAuctionCompleted = auction.status === "COMPLETED";
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
  const canCancelTrade = isAuctionCompleted && (isSeller || isWinner);
  const shouldShowCancelTrade = isAuctionCompleted;
  const winnerNickname =
    winningBid?.bidderNickname ||
    (auction.winnerId ? `회원 #${auction.winnerId}` : "-");
  const winningPrice =
    winningBid?.price ?? auction.currentHighestBid ?? null;
  const winningAt = winningBid?.createdAt ?? auction.closedAt ?? null;
  const canStartChat =
    isAuctionCompleted && (isWinner || isSeller) && !!auction.winnerId;

  return (
    <div className="page">
      <section className="grid-2">
        <Card>
          <h2 style={{ marginTop: 0 }}>이미지</h2>
          {auction.imageUrls?.length ? (
            <div className="grid-2">
              {auction.imageUrls.map((url, index) => {
                const resolvedUrl = resolveImageUrl(url);
                return (
                  <Panel key={`${url}-${index}`}>
                    <img
                      alt={`경매 이미지 ${index + 1}`}
                      src={resolvedUrl}
                      style={{ width: "100%", borderRadius: 12 }}
                    />
                  </Panel>
                );
              })}
            </div>
          ) : (
            <EmptyState message="등록된 이미지가 없습니다." />
          )}
        </Card>
        <Card>
          <div className="tag">{getAuctionStatusLabel(auction.status)}</div>
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
          {auction.status === "COMPLETED" ? (
            <Panel style={{ marginTop: 16 }}>
              <h3 style={{ marginTop: 0 }}>낙찰 정보</h3>
              <div className="muted">낙찰자 {winnerNickname}</div>
              <div>낙찰가 {formatNumber(winningPrice)}원</div>
              <div className="muted">낙찰 시간 {winningAt || "-"}</div>
              {canStartChat ? (
                <div className="actions" style={{ marginTop: 12 }}>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={handleChat}
                    disabled={isCreatingChat}
                  >
                    {isCreatingChat ? "채팅방 생성 중..." : "채팅 시작"}
                  </button>
                </div>
              ) : null}
              {chatError ? (
                <ErrorMessage message={chatError} style={{ marginTop: 8 }} />
              ) : null}
            </Panel>
          ) : null}
          {auction.status === "CANCELLED" ? (
            <Panel style={{ marginTop: 16 }}>
              <h3 style={{ marginTop: 0 }}>취소 정보</h3>
              <div className="muted">
                취소자{" "}
                {auction.cancellerRoleDescription ||
                  auction.cancellerRole ||
                  "-"}
              </div>
              <div className="muted">취소 시간 {auction.closedAt || "-"}</div>
            </Panel>
          ) : null}
          {!isSeller ? (
            <Panel style={{ marginTop: 16 }}>
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
                <ErrorMessage message={bidError} style={{ marginTop: 8 }} />
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
            </Panel>
          ) : null}
          {isSeller ? (
            <Panel style={{ marginTop: 16 }}>
              <div className="actions">
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => router.push(`/auctions/${auction.auctionId}/edit`)}
                  disabled={!isEditable}
                >
                  수정
                </button>
                {isAuctionOpen ? (
                  <button
                    className="btn btn-danger"
                    type="button"
                    onClick={handleCancelTrade}
                    disabled={isCanceling || !canDelete}
                  >
                    {isCanceling ? "취소 중..." : "경매 취소"}
                  </button>
                ) : null}
              </div>
              {cancelError ? (
                <ErrorMessage message={cancelError} style={{ marginTop: 8 }} />
              ) : null}
              {!canDelete && isAuctionOpen ? (
                <div className="muted" style={{ marginTop: 8 }}>
                  입찰이 있으면 취소할 수 없습니다.
                </div>
              ) : null}
              {!isEditable ? (
                <div className="muted" style={{ marginTop: 8 }}>
                  입찰이 없을 때만 수정할 수 있습니다.
                </div>
              ) : null}
            </Panel>
          ) : null}
          {shouldShowCancelTrade ? (
            <Panel style={{ marginTop: 16 }}>
              <div className="actions">
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={handleCancelTrade}
                  disabled={isCanceling || !canCancelTrade}
                >
                  {isCanceling ? "취소 처리 중..." : "거래 취소"}
                </button>
              </div>
              {cancelError ? (
                <ErrorMessage message={cancelError} style={{ marginTop: 8 }} />
              ) : null}
              {cancelSuccess ? (
                <div className="success" style={{ marginTop: 8 }}>
                  {cancelSuccess}
                </div>
              ) : null}
              {!canCancelTrade ? (
                <div className="muted" style={{ marginTop: 8 }}>
                  거래 취소 권한이 없습니다.
                </div>
              ) : null}
            </Panel>
          ) : null}
          <Panel style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>입찰 내역</h3>
            {isBidsLoading ? (
              <>
                <SkeletonLine width="60%" />
                <SkeletonLine width="80%" style={{ marginTop: 8 }} />
              </>
            ) : bidsError ? (
              <ErrorMessage message={bidsError} />
            ) : bids.length === 0 ? (
              <EmptyState message="입찰 내역이 없습니다." />
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
          </Panel>
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
            <Panel style={{ marginTop: 16 }}>
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
                <ErrorMessage message={reportError} style={{ marginTop: 8 }} />
              ) : null}
              {reportSuccess ? (
                <div className="success" style={{ marginTop: 8 }}>
                  {reportSuccess}
                </div>
              ) : null}
            </Panel>
          ) : null}
          <Panel style={{ marginTop: 16 }}>
            {auction.status === "OPEN"
              ? "진행 중인 경매입니다. 새로고침으로 최신 상태를 확인하세요."
              : auction.status === "CLOSED"
                ? "입찰 없이 종료된 경매입니다."
                : auction.status === "COMPLETED"
                  ? "낙찰이 완료된 경매입니다."
                  : "취소된 경매입니다."}
          </Panel>
        </Card>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { buildApiUrl, parseRsData } from "@/lib/api";

type AuctionDetail = {
  auctionId: number;
  name: string;
  description: string;
  startPrice: number;
  currentHighestBid: number;
  buyNowPrice?: number;
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

export default function AuctionDetailPage() {
  const params = useParams();
  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const auctionId = useMemo(() => {
    const raw = params?.id;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value ? Number(value) : null;
  }, [params]);

  useEffect(() => {
    if (!auctionId) {
      setErrorMessage("잘못된 접근입니다.");
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    const fetchDetail = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetch(buildApiUrl(`/api/auctions/${auctionId}`));
        const { rsData, errorMessage: apiError } =
          await parseRsData<AuctionDetail>(response);
        if (!isMounted) return;
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
        if (isMounted) {
          setErrorMessage("네트워크 오류가 발생했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [auctionId]);

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

  return (
    <div className="page">
      <section className="grid-2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>이미지</h2>
          {auction.imageUrls?.length ? (
            <div className="grid-2">
              {auction.imageUrls.map((url, index) => (
                <div key={`${url}-${index}`} className="panel">
                  <div className="muted">이미지 URL</div>
                  <div style={{ wordBreak: "break-all" }}>{url}</div>
                </div>
              ))}
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
            시작가 {auction.startPrice.toLocaleString()}원 · 현재가{" "}
            {auction.currentHighestBid.toLocaleString()}원
          </div>
          {auction.buyNowPrice ? (
            <div className="muted">즉시구매 {auction.buyNowPrice}원</div>
          ) : null}
          <div className="muted">
            입찰 {auction.bidCount}회 · 시작 {auction.startAt} · 종료{" "}
            {auction.endAt}
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

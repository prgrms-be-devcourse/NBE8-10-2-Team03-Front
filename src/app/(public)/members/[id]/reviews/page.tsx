"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { buildApiUrl, getAuthHeaders, safeJson } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SkeletonLine } from "@/components/ui/SkeletonLine";
import { formatDateTime } from "@/lib/datetime";

type ReviewDto = {
  id: number;
  createDate: string;
  modifyDate: string;
  score: number;
  comment?: string | null;
  memberId: number;
  reviewerId: number;
};

export default function MemberReviewsPage() {
  const params = useParams();
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const memberId = useMemo(() => {
    const raw = params?.id;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value ? Number(value) : null;
  }, [params]);

  useEffect(() => {
    if (!memberId) {
      setErrorMessage("잘못된 접근입니다.");
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    const fetchReviews = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetch(
          buildApiUrl(`/api/v1/members/${memberId}/review`),
          {
            method: "GET",
            headers: getAuthHeaders(),
            credentials: "include",
          }
        );
        if (!response.ok) {
          setErrorMessage("리뷰를 불러오지 못했습니다.");
          return;
        }
        const json = await safeJson<ReviewDto[]>(response);
        if (!json) {
          setErrorMessage("응답 파싱에 실패했습니다.");
          return;
        }
        if (!isMounted) return;
        setReviews(json);
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
    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, [memberId]);

  const averageScore = useMemo(() => {
    if (reviews.length === 0) return null;
    const total = reviews.reduce((sum, review) => sum + review.score, 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  return (
    <div className="page">
      <Card>
        <div className="actions" style={{ marginBottom: 12 }}>
          <Link className="btn btn-ghost" href="/posts">
            목록으로 이동
          </Link>
        </div>
        <h1 style={{ marginTop: 0 }}>판매자 리뷰</h1>
        {averageScore !== null ? (
          <div className="tag" style={{ marginTop: 8 }}>
            평균 {averageScore}점 ({reviews.length}건)
          </div>
        ) : null}
        {isLoading ? (
          <>
            <SkeletonLine width="60%" />
            <SkeletonLine width="80%" style={{ marginTop: 12 }} />
          </>
        ) : errorMessage ? (
          <ErrorMessage message={errorMessage} />
        ) : reviews.length === 0 ? (
          <EmptyState message="아직 등록된 리뷰가 없습니다." />
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {reviews.map((review) => (
              <div key={review.id} className="card">
                <div className="muted">평점 {review.score}</div>
                <div style={{ marginTop: 6 }}>
                  {review.comment || "코멘트 없음"}
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {formatDateTime(review.createDate)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import {
  apiRequest,
  buildApiUrl,
  getAuthHeaders,
  isSuccessResultCode,
  safeJson,
} from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Panel } from "@/components/ui/Panel";
import { SkeletonLine } from "@/components/ui/SkeletonLine";
import { getPostStatusLabel } from "@/lib/status";
import { formatDateTime } from "@/lib/datetime";

type PostDetail = {
  id: number;
  title: string;
  content: string;
  price: number;
  status: string;
  statusDisplayName?: string;
  categoryName: string;
  sellerId?: number;
  sellerNickname: string;
  sellerBadge?: string;
  sellerScore?: number;
  imageUrls: string[];
  createDate: string;
  viewCount: number;
};

const resolveImageUrl = (url: string) => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return buildApiUrl(url);
};

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const auth = useAuth();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [statusValue, setStatusValue] = useState("SALE");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  const postId = useMemo(() => {
    const raw = params?.id;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value ? Number(value) : null;
  }, [params]);

  const isSeller = useMemo(() => {
    if (!auth?.me || !post) return false;
    if (post.sellerId !== undefined && post.sellerId !== null) {
      return auth.me.id === post.sellerId;
    }
    return (
      auth.me.username === post.sellerNickname ||
      auth.me.name === post.sellerNickname
    );
  }, [auth?.me, post]);

  useEffect(() => {
    if (!postId) {
      setErrorMessage("잘못된 접근입니다.");
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    const fetchDetail = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const { rsData, errorMessage: apiError, response } =
          await apiRequest<PostDetail>(`/api/v1/posts/${postId}`);
        if (!isMounted) return;
        if (!response.ok || apiError || !rsData) {
          setPost(null);
          setErrorMessage(apiError || "상세 정보를 불러오지 못했습니다.");
          return;
        }
        setPost(rsData.data);
        setStatusValue(rsData.data.status);
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
  }, [postId]);

  const handleDelete = async () => {
    if (!postId || isDeleting) return;
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const { rsData, errorMessage: apiError, response } =
        await apiRequest<{ id: number }>(`/api/v1/posts/${postId}`, {
          method: "DELETE",
        });
      if (!response.ok || apiError || !rsData) {
        setErrorMessage(apiError || "삭제에 실패했습니다.");
        return;
      }
      router.push("/posts");
    } catch {
      setErrorMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChat = async () => {
    if (!auth?.me) {
      router.push("/login");
      return;
    }
    if (!postId || !post || isSeller) return;
    if (isCreatingChat) return;
    setIsCreatingChat(true);
    setChatError(null);
    const query = new URLSearchParams({
      itemId: `${postId}`,
      txType: "POST",
    });
    try {
      const response = await fetch(
        buildApiUrl(`/api/v1/chat/room?${query.toString()}`),
        {
          method: "POST",
          headers: getAuthHeaders(),
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
      router.push(`/chat?roomId=${encodeURIComponent(roomId)}&itemId=${postId}`);
    } catch {
      setChatError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!postId || !post || isStatusUpdating) return;
    setIsStatusUpdating(true);
    setStatusError(null);
    setStatusSuccess(null);
    try {
      const { rsData, errorMessage: apiError, response } =
        await apiRequest<{ id: number }>(`/api/v1/posts/${postId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: statusValue }),
        });
      if (!response.ok || apiError || !rsData) {
        setStatusError(apiError || "상태 변경에 실패했습니다.");
        return;
      }
      setPost((prev) =>
        prev
          ? {
              ...prev,
              status: statusValue,
              statusDisplayName: getPostStatusLabel(statusValue),
            }
          : prev
      );
      setStatusSuccess(rsData.msg || "상태가 변경되었습니다.");
    } catch {
      setStatusError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleReportSeller = async () => {
    if (!post?.sellerId || isReporting) return;
    if (!confirm("판매자를 신고하시겠습니까?")) return;
    setIsReporting(true);
    setReportError(null);
    setReportSuccess(null);
    try {
      const { rsData, errorMessage: apiError, response } =
        await apiRequest<null>(`/api/v1/members/${post.sellerId}/credit`, {
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
          <Link className="btn btn-ghost" href="/posts">
            목록으로 이동
          </Link>
        </div>
      </Card>
    );
  }

  if (!post) {
    return <EmptyState message="존재하지 않는 게시글입니다." />;
  }

  return (
    <div className="page">
      <section className="grid-2">
        <Card>
          <h2 style={{ marginTop: 0 }}>이미지</h2>
          {post.imageUrls?.length ? (
            <div className="grid-2">
              {post.imageUrls.map((url, index) => {
                const resolvedUrl = resolveImageUrl(url);
                return (
                  <Panel key={`${url}-${index}`}>
                    <img
                      alt={`게시글 이미지 ${index + 1}`}
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
          <div className="tag" style={{ marginTop: 0, marginBottom: 8 }}>
            {post.categoryName}
          </div>
          <h1 style={{ marginTop: 0 }}>{post.title}</h1>
          <p style={{ marginTop: 12 }}>{post.content}</p>
          <div className="muted">
            {post.price.toLocaleString()}원 ·{" "}
            {post.statusDisplayName || getPostStatusLabel(post.status)} ·{" "}
            {formatDateTime(post.createDate)} · 조회{" "}
            {post.viewCount.toLocaleString()}
          </div>
          <div style={{ marginTop: 16 }}>
            판매자 <strong>{post.sellerNickname}</strong>
          </div>
          {post.sellerId ? (
            <div className="actions" style={{ marginTop: 8 }}>
              <Link
                className="btn btn-ghost"
                href={`/members/${post.sellerId}/reviews`}
              >
                판매자 리뷰 보기
              </Link>
            </div>
          ) : null}
          <div className="muted" style={{ marginTop: 6 }}>
            신용 점수 {post.sellerScore ?? "-"}
          </div>
          {post.sellerBadge ? (
            <div className="tag" style={{ marginTop: 8 }}>
              {post.sellerBadge}
            </div>
          ) : null}
          <div className="actions" style={{ marginTop: 20 }}>
            {!isSeller ? (
              <div>
                <button
                  className="btn btn-primary"
                  onClick={handleChat}
                  disabled={isCreatingChat}
                >
                  {isCreatingChat ? "채팅방 생성 중..." : "채팅 시작"}
                </button>
                {chatError ? (
                  <ErrorMessage message={chatError} style={{ marginTop: 8 }} />
                ) : null}
              </div>
            ) : null}
            {isSeller ? (
              <>
                <button
                  className="btn btn-ghost"
                  onClick={() => router.push(`/posts/${post.id}/edit`)}
                >
                  수정
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  삭제
                </button>
              </>
            ) : null}
          </div>
          {!isSeller && post.sellerId ? (
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
          {isSeller ? (
            <Panel style={{ marginTop: 16 }}>
              <div className="field">
                <label className="label" htmlFor="post-status">
                  상태 변경
                </label>
                <select
                  id="post-status"
                  className="select"
                  value={statusValue}
                  onChange={(event) => setStatusValue(event.target.value)}
                  disabled={isStatusUpdating}
                >
                  <option value="SALE">판매중</option>
                  <option value="RESERVED">예약중</option>
                  <option value="SOLD">판매완료</option>
                </select>
              </div>
              {statusError ? (
                <ErrorMessage message={statusError} style={{ marginTop: 8 }} />
              ) : null}
              {statusSuccess ? (
                <div className="success" style={{ marginTop: 8 }}>
                  {statusSuccess}
                </div>
              ) : null}
              <div className="actions" style={{ marginTop: 12 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleStatusUpdate}
                  disabled={isStatusUpdating}
                >
                  {isStatusUpdating ? "변경 중..." : "상태 변경"}
                </button>
              </div>
            </Panel>
          ) : null}
        </Card>
      </section>
    </div>
  );
}








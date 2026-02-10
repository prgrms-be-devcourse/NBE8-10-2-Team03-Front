"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, buildApiUrl, getAuthHeaders, parseRsData, resolveImageUrl, safeJson } from "@/lib/api";
import { useAuth, type MemberMe } from "@/components/auth/AuthContext";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SkeletonLine } from "@/components/ui/SkeletonLine";
import { formatDateTime } from "@/lib/datetime";

// Local type definition removed in favor of imported MemberMe

type PostListItem = {
  id: number;
  title: string;
  price: number;
  categoryName: string;
  thumbnailUrl?: string;
  createDate: string;
  status: string;
  statusDisplayName?: string;
  viewCount: number;
  sellerId: number;
  sellerNickname: string;
  sellerBadge?: string;
};

type PostPageResponse = {
  content?: PostListItem[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  currentStatusFilter?: string;
};

type AuctionListItem = {
  auctionId: number;
  name: string;
  thumbnailUrl?: string;
  startPrice: number;
  currentHighestBid: number | null;
  buyNowPrice?: number;
  status: string;
  endAt: string;
  bidCount: number;
  seller: {
    id: number;
    nickname: string;
    reputationScore: number;
  };
  categoryName?: string;
};

type AuctionPageResponse = {
  content?: AuctionListItem[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
};

type ReviewDto = {
  id: number;
  createDate: string;
  modifyDate: string;
  score: number;
  comment?: string;
  memberId: number;
  reviewerId: number;
};

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString();
};

export default function MyPage() {
  const router = useRouter();
  const { me, setMe: setGlobalMe } = useAuth()!;
  // Local state me removed in favor of global me from AuthContext
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [nicknameSuccess, setNicknameSuccess] = useState<string | null>(null);
  const [isNicknameLoading, setIsNicknameLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [profileImgError, setProfileImgError] = useState<string | null>(null);
  const [profileImgSuccess, setProfileImgSuccess] = useState<string | null>(null);
  const [isProfileImgLoading, setIsProfileImgLoading] = useState(false);

  const [postStatusFilter, setPostStatusFilter] = useState("all");
  const [postPage, setPostPage] = useState(0);
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [postsPage, setPostsPage] = useState<PostPageResponse | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [isPostStatusUpdating, setIsPostStatusUpdating] = useState(false);
  const [postStatusError, setPostStatusError] = useState<string | null>(null);
  const [postsRefreshTick, setPostsRefreshTick] = useState(0);

  const [auctionStatusFilter, setAuctionStatusFilter] = useState("OPEN");
  const [auctionPage, setAuctionPage] = useState(0);
  const [auctions, setAuctions] = useState<AuctionListItem[]>([]);
  const [auctionsPage, setAuctionsPage] =
    useState<AuctionPageResponse | null>(null);
  const [auctionsError, setAuctionsError] = useState<string | null>(null);
  const [isAuctionsLoading, setIsAuctionsLoading] = useState(false);

  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);

  // Removed local fetchMe effect to rely on ProtectedLayout's global fetch or manual refreshes
  // This prevents double fetching on mount and ensures state consistency

  useEffect(() => {
    if (me) {
      setNickname(me.name);
      setIsLoading(false); // Ensure loading is cleared when global me is available
    }
  }, [me]);

  useEffect(() => {
    if (!me) return;
    let isMounted = true;
    const fetchPosts = async () => {
      setIsPostsLoading(true);
      setPostsError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(postPage));
        params.set("size", "10");
        if (postStatusFilter && postStatusFilter !== "all") {
          params.set("status", postStatusFilter);
        }
        const { rsData, errorMessage: apiError, response } =
          await apiRequest<PostPageResponse>(
            `/api/v1/members/me/posts?${params.toString()}`
          );
        if (!isMounted) return;
        if (!response.ok || apiError || !rsData) {
          setPosts([]);
          setPostsPage(null);
          setPostsError(apiError || "내 거래를 불러오지 못했습니다.");
          return;
        }
        setPosts(rsData.data?.content ?? []);
        setPostsPage(rsData.data ?? null);
      } catch {
        if (isMounted) {
          setPosts([]);
          setPostsPage(null);
          setPostsError("네트워크 오류가 발생했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsPostsLoading(false);
        }
      }
    };
    fetchPosts();
    return () => {
      isMounted = false;
    };
  }, [me, postPage, postStatusFilter, postsRefreshTick]);

  useEffect(() => {
    if (!me) return;
    let isMounted = true;
    const fetchAuctions = async () => {
      setIsAuctionsLoading(true);
      setAuctionsError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(auctionPage));
        params.set("size", "10");
        if (auctionStatusFilter) {
          params.set("status", auctionStatusFilter);
        }
        const { rsData, errorMessage: apiError, response } =
          await apiRequest<AuctionPageResponse>(
            `/api/v1/members/me/auctions?${params.toString()}`
          );
        if (!isMounted) return;
        if (!response.ok || apiError || !rsData) {
          setAuctions([]);
          setAuctionsPage(null);
          setAuctionsError(apiError || "내 경매를 불러오지 못했습니다.");
          return;
        }
        setAuctions(rsData.data?.content ?? []);
        setAuctionsPage(rsData.data ?? null);
      } catch {
        if (isMounted) {
          setAuctions([]);
          setAuctionsPage(null);
          setAuctionsError("네트워크 오류가 발생했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsAuctionsLoading(false);
        }
      }
    };
    fetchAuctions();
    return () => {
      isMounted = false;
    };
  }, [me, auctionPage, auctionStatusFilter]);

  useEffect(() => {
    if (!me) return;
    let isMounted = true;
    const fetchReviews = async () => {
      setIsReviewsLoading(true);
      setReviewsError(null);
      try {
        const response = await fetch(
          buildApiUrl(`/api/v1/members/${me.id}/review`),
          {
            method: "GET",
            headers: getAuthHeaders(),
            credentials: "include",
          }
        );
        if (!response.ok) {
          setReviewsError("리뷰를 불러오지 못했습니다.");
          return;
        }
        const json = await safeJson<ReviewDto[]>(response);
        if (!json) {
          setReviewsError("응답 파싱에 실패했습니다.");
          return;
        }
        if (!isMounted) return;
        setReviews(json);
      } catch {
        if (isMounted) {
          setReviewsError("네트워크 오류가 발생했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsReviewsLoading(false);
        }
      }
    };
    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, [me]);

  const handleNicknameSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      setNicknameError("닉네임을 입력해 주세요.");
      setNicknameSuccess(null);
      return;
    }
    setIsNicknameLoading(true);
    setNicknameError(null);
    setNicknameSuccess(null);
    try {
      const { rsData, errorMessage: apiError, response } =
        await apiRequest<unknown>("/api/v1/members/me/nickname", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname: trimmedNickname }),
        });
      if (!response.ok || apiError || !rsData) {
        setNicknameError(apiError || "닉네임 수정에 실패했습니다.");
        return;
      }
      setGlobalMe(me ? { ...me, name: trimmedNickname } : null);
      setNicknameSuccess(rsData.msg || "닉네임이 수정되었습니다.");
    } catch {
      setNicknameError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsNicknameLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentPassword) {
      setPasswordError("현재 비밀번호를 입력해 주세요.");
      setPasswordSuccess(null);
      return;
    }
    if (!newPassword) {
      setPasswordError("새 비밀번호를 입력해 주세요.");
      setPasswordSuccess(null);
      return;
    }
    if (!confirmPassword) {
      setPasswordError("새 비밀번호 확인을 입력해 주세요.");
      setPasswordSuccess(null);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("비밀번호가 일치하지 않습니다.");
      setPasswordSuccess(null);
      return;
    }
    setIsPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    try {
      const { rsData, errorMessage: apiError, response } =
        await apiRequest<unknown>("/api/v1/members/me/password", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: currentPassword,
            newPassword,
            checkPassword: confirmPassword,
          }),
        });
      if (!response.ok || apiError || !rsData) {
        setPasswordError(apiError || "비밀번호 수정에 실패했습니다.");
        setPasswordSuccess(null);
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      setPasswordSuccess(rsData.msg || "비밀번호가 수정되었습니다.");
    } catch {
      setPasswordError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleProfileImgChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProfileImgLoading(true);
    setProfileImgError(null);
    setProfileImgSuccess(null);

    try {
      const formData = new FormData();
      formData.append("profileImg", file);

      const { rsData, errorMessage: apiError, response } = await apiRequest<unknown>("/api/v1/members/me/profile", {
        method: "PATCH",
        body: formData,
      });

      if (!response.ok || apiError || !rsData) {
        setProfileImgError(apiError || "프로필 이미지 수정에 실패했습니다.");
        return;
      }

      // Optimistically update the UI with the local blob URL
      // This ensures the image reflects immediately even if the backend DTO is missing the field
      const blobUrl = URL.createObjectURL(file);
      if (me) {
        setGlobalMe({ ...me, profileImgUrl: blobUrl });
      }

      // Re-fetch 'me' info to get the server-side profileImgUrl
      const { rsData: meRsData, response: meResponse } = await apiRequest<MemberMe>("/api/v1/members/me");
      if (meResponse.ok && meRsData?.data) {
        setGlobalMe(meRsData.data);
      }

      setProfileImgSuccess(rsData.msg || "프로필 이미지가 수정되었습니다.");
    } catch {
      setProfileImgError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsProfileImgLoading(false);
      // Reset input value so same file can be selected again
      event.target.value = "";
    }
  };

  const handleWithdraw = async () => {
    if (isWithdrawing) return;
    if (!confirm("정말 탈퇴하시겠습니까?")) return;
    setIsWithdrawing(true);
    setWithdrawError(null);
    try {
      const { rsData, errorMessage: apiError, response } =
        await apiRequest<null>("/api/v1/members/me/withdraw", {
          method: "PATCH",
        });
      if (!response.ok || apiError || !rsData) {
        setWithdrawError(apiError || "탈퇴 처리에 실패했습니다.");
        return;
      }
      router.replace("/login");
    } catch {
      setWithdrawError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handlePostStatusUpdate = async (postId: number, status: string) => {
    if (isPostStatusUpdating) return;
    setIsPostStatusUpdating(true);
    setPostStatusError(null);
    try {
      const { rsData, errorMessage: apiError, response } =
        await apiRequest<{ id: number }>(`/api/v1/posts/${postId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
      if (!response.ok || apiError || !rsData) {
        setPostStatusError(apiError || "상태 변경에 실패했습니다.");
        return;
      }
      setPostsRefreshTick((prev) => prev + 1);
    } catch {
      setPostStatusError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsPostStatusUpdating(false);
    }
  };

  const postPageSummary = useMemo(() => {
    if (!postsPage) return "";
    return `${(postsPage.page ?? 0) + 1} / ${postsPage.totalPages ?? 1}`;
  }, [postsPage]);

  const auctionPageSummary = useMemo(() => {
    if (!auctionsPage) return "";
    return `${(auctionsPage.page ?? 0) + 1} / ${auctionsPage.totalPages ?? 1}`;
  }, [auctionsPage]);

  if (isLoading) {
    return (
      <Card>
        <SkeletonLine width="60%" />
        <SkeletonLine width="90%" style={{ marginTop: 12 }} />
      </Card>
    );
  }

  if (errorMessage) {
    return <ErrorMessage message={errorMessage} />;
  }

  if (!me) {
    return <EmptyState message="사용자 정보를 찾을 수 없습니다." />;
  }

  return (
    <div className="page">
      <div className="grid-2">
        <Card>
          <h2 style={{ marginTop: 0 }}>프로필</h2>
          <div style={{ display: "flex", gap: "24px", alignItems: "center", marginTop: 24 }}>
            <div style={{ flex: 7, display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "20px", fontWeight: 700, lineHeight: 1.2 }}>
                {me.name} ({me.username})
              </div>
              <div className="muted">
                가입일: {me.createDate.split("T")[0]}
              </div>
            </div>
            <div style={{ flex: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "50%",
                  backgroundColor: "var(--bg-strong)",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--border)",
                  marginBottom: "0",
                }}
              >
                <img
                  src={resolveImageUrl(me.profileImgUrl)}
                  alt="프로필"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <label
                className="btn btn-ghost"
                style={{
                  fontSize: "14px",
                  padding: "4px 12px",
                  cursor: isProfileImgLoading ? "not-allowed" : "pointer",
                  display: "inline-block"
                }}
              >
                {isProfileImgLoading ? "업로드 중..." : "프로필 변경"}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleProfileImgChange}
                  disabled={isProfileImgLoading}
                />
              </label>
              {profileImgError ? (
                <div style={{ color: "var(--error)", fontSize: "12px", textAlign: "center" }}>{profileImgError}</div>
              ) : null}
              {profileImgSuccess ? (
                <div style={{ color: "var(--success)", fontSize: "12px", textAlign: "center" }}>{profileImgSuccess}</div>
              ) : null}
            </div>
          </div>
        </Card>
        <Card>
          <h2 style={{ marginTop: 0 }}>신뢰도</h2>
          <div style={{ fontSize: 32, fontWeight: 700 }}>
            {me.score === null ? "-" : me.score.toFixed(1)}
          </div>
        </Card>
        <Card>
          <h2 style={{ marginTop: 0 }}>닉네임 수정</h2>
          <form onSubmit={handleNicknameSubmit}>
            <div className="field">
              <label className="label" htmlFor="nickname">
                닉네임
              </label>
              <input
                id="nickname"
                className="input"
                value={nickname}
                onChange={(event) => {
                  setNickname(event.target.value);
                  setNicknameError(null);
                  setNicknameSuccess(null);
                }}
                placeholder="닉네임"
                autoComplete="nickname"
              />
            </div>
            {nicknameError ? (
              <ErrorMessage message={nicknameError} style={{ marginTop: 12 }} />
            ) : null}
            {nicknameSuccess ? (
              <div className="success" style={{ marginTop: 12 }}>
                {nicknameSuccess}
              </div>
            ) : null}
            <button
              className="btn btn-primary"
              type="submit"
              disabled={isNicknameLoading}
              style={{ marginTop: 16 }}
            >
              {isNicknameLoading ? "수정 중..." : "닉네임 변경"}
            </button>
          </form>
        </Card>

        <Card>
          <h2 style={{ marginTop: 0 }}>비밀번호 수정</h2>
          <form onSubmit={handlePasswordSubmit}>
            <div className="field">
              <label className="label" htmlFor="current-password">
                현재 비밀번호
              </label>
              <input
                id="current-password"
                className="input"
                type="password"
                value={currentPassword}
                onChange={(event) => {
                  setCurrentPassword(event.target.value);
                  setPasswordError(null);
                  setPasswordSuccess(null);
                }}
                placeholder="current password"
                autoComplete="current-password"
                disabled={isPasswordLoading}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="new-password">
                새 비밀번호
              </label>
              <input
                id="new-password"
                className="input"
                type="password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setPasswordError(null);
                  setPasswordSuccess(null);
                }}
                placeholder="new password"
                autoComplete="new-password"
                disabled={isPasswordLoading}
              />
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label className="label" htmlFor="confirm-password">
                새 비밀번호 확인
              </label>
              <input
                id="confirm-password"
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setPasswordError(null);
                  setPasswordSuccess(null);
                }}
                placeholder="confirm new password"
                autoComplete="new-password"
                disabled={isPasswordLoading}
              />
            </div>
            {passwordError ? (
              <ErrorMessage message={passwordError} style={{ marginTop: 12 }} />
            ) : null}
            {passwordSuccess ? (
              <div className="success" style={{ marginTop: 12 }}>
                {passwordSuccess}
              </div>
            ) : null}
            <button
              className="btn btn-primary"
              type="submit"
              disabled={isPasswordLoading}
              style={{ marginTop: 16 }}
            >
              {isPasswordLoading ? "수정 중..." : "비밀번호 변경"}
            </button>
          </form>
        </Card>
      </div>

      <div className="grid-2" style={{ marginTop: 24 }}>
        <Card>
          <h2 style={{ marginTop: 0 }}>내 거래</h2>
          <div className="field-row" style={{ marginTop: 12 }}>
            <div className="field">
              <label className="label" htmlFor="postStatus">
                상태
              </label>
              <select
                id="postStatus"
                className="select"
                value={postStatusFilter}
                onChange={(event) => {
                  setPostStatusFilter(event.target.value);
                  setPostPage(0);
                }}
              >
                <option value="all">전체</option>
                <option value="sale">판매중</option>
                <option value="reserved">예약중</option>
                <option value="sold">판매완료</option>
              </select>
            </div>
          </div>
          {isPostsLoading ? (
            <SkeletonLine width="70%" />
          ) : postsError ? (
            <ErrorMessage message={postsError} />
          ) : posts.length === 0 ? (
            <EmptyState message="표시할 거래가 없습니다." />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="card"
                  style={{ textAlign: "left", cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/posts/${post.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/posts/${post.id}`);
                    }
                  }}
                >
                  <div className="muted">
                    {post.statusDisplayName || post.status}
                  </div>
                  <div style={{ marginTop: 6 }}>{post.title}</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {formatNumber(post.price)}원 · {formatDateTime(post.createDate)}
                  </div>
                  {post.sellerBadge ? (
                    <div className="tag" style={{ marginTop: 8 }}>
                      {post.sellerBadge}
                    </div>
                  ) : null}
                  <div className="actions" style={{ marginTop: 8 }}>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handlePostStatusUpdate(post.id, "SOLD");
                      }}
                      disabled={isPostStatusUpdating || post.status === "SOLD"}
                    >
                      {post.status === "SOLD" ? "판매 완료" : "판매 완료 처리"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {postStatusError ? (
            <ErrorMessage message={postStatusError} style={{ marginTop: 8 }} />
          ) : null}
          {postsPage ? (
            <div className="actions" style={{ marginTop: 12 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setPostPage((prev) => Math.max(prev - 1, 0))}
                disabled={(postsPage.page ?? 0) <= 0}
              >
                이전
              </button>
              <span className="muted">{postPageSummary}</span>
              <button
                className="btn btn-ghost"
                onClick={() =>
                  setPostPage((prev) =>
                    postsPage.totalPages
                      ? Math.min(prev + 1, postsPage.totalPages - 1)
                      : prev + 1
                  )
                }
                disabled={
                  postsPage.totalPages !== undefined &&
                  postsPage.totalPages > 0 &&
                  (postsPage.page ?? 0) >= postsPage.totalPages - 1
                }
              >
                다음
              </button>
            </div>
          ) : null}
        </Card>

        <Card>
          <h2 style={{ marginTop: 0 }}>내 경매</h2>
          <div className="field-row" style={{ marginTop: 12 }}>
            <div className="field">
              <label className="label" htmlFor="auctionStatus">
                상태
              </label>
              <select
                id="auctionStatus"
                className="select"
                value={auctionStatusFilter}
                onChange={(event) => {
                  setAuctionStatusFilter(event.target.value);
                  setAuctionPage(0);
                }}
              >
                <option value="OPEN">진행 중</option>
                <option value="CLOSED">입찰 없음</option>
                <option value="COMPLETED">낙찰 완료</option>
                <option value="CANCELLED">취소됨</option>
              </select>
            </div>
          </div>
          {isAuctionsLoading ? (
            <SkeletonLine width="70%" />
          ) : auctionsError ? (
            <ErrorMessage message={auctionsError} />
          ) : auctions.length === 0 ? (
            <EmptyState message="표시할 경매가 없습니다." />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {auctions.map((auction) => (
                <div
                  key={auction.auctionId}
                  className="card"
                  style={{ textAlign: "left", cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/auctions/${auction.auctionId}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/auctions/${auction.auctionId}`);
                    }
                  }}
                >
                  <div className="muted">{auction.status}</div>
                  <div style={{ marginTop: 6 }}>{auction.name}</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    현재가{" "}
                    {formatNumber(
                      auction.currentHighestBid ?? auction.startPrice
                    )}
                    원 · 입찰 {auction.bidCount}건
                  </div>
                </div>
              ))}
            </div>
          )}
          {auctionsPage ? (
            <div className="actions" style={{ marginTop: 12 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setAuctionPage((prev) => Math.max(prev - 1, 0))}
                disabled={(auctionsPage.page ?? 0) <= 0}
              >
                이전
              </button>
              <span className="muted">{auctionPageSummary}</span>
              <button
                className="btn btn-ghost"
                onClick={() =>
                  setAuctionPage((prev) =>
                    auctionsPage.totalPages
                      ? Math.min(prev + 1, auctionsPage.totalPages - 1)
                      : prev + 1
                  )
                }
                disabled={
                  auctionsPage.totalPages !== undefined &&
                  auctionsPage.totalPages > 0 &&
                  (auctionsPage.page ?? 0) >= auctionsPage.totalPages - 1
                }
              >
                다음
              </button>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="grid-2" style={{ marginTop: 24 }}>
        <Card>
          <h2 style={{ marginTop: 0 }}>내 리뷰</h2>
          <div className="actions" style={{ marginTop: 8, marginBottom: 8 }}>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => router.push(`/members/${me.id}/reviews`)}
            >
              내 리뷰 보기
            </button>
          </div>
          {isReviewsLoading ? (
            <SkeletonLine width="70%" />
          ) : reviewsError ? (
            <ErrorMessage message={reviewsError} />
          ) : reviews.length === 0 ? (
            <EmptyState message="아직 받은 리뷰가 없습니다." />
          ) : (
            <div
              style={{
                display: "grid",
                gap: 12,
                maxHeight: 320,
                overflowY: "auto",
                paddingRight: 6,
              }}
            >
              {reviews.map((review) => (
                <div key={review.id} className="card">
                  <div className="muted">평점 {review.score}</div>
                  <div style={{ marginTop: 6 }}>
                    {review.comment || "내용 없음"}
                  </div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {formatDateTime(review.createDate)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 style={{ marginTop: 0 }}>회원 탈퇴</h2>
          <p className="muted">
            탈퇴 시 계정 복구가 불가능합니다. 신중히 진행해 주세요.
          </p>
          {withdrawError ? (
            <ErrorMessage message={withdrawError} style={{ marginTop: 12 }} />
          ) : null}
          <button
            className="btn btn-danger"
            type="button"
            onClick={handleWithdraw}
            disabled={isWithdrawing}
            style={{ marginTop: 16 }}
          >
            {isWithdrawing ? "처리 중..." : "탈퇴하기"}
          </button>
        </Card>
      </div>
    </div>
  );
}

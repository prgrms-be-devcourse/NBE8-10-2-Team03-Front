"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { apiRequest, buildApiUrl } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SkeletonLine } from "@/components/ui/SkeletonLine";
import { getPostStatusLabel } from "@/lib/status";
import { CATEGORIES } from "@/lib/categories";
import { formatDateTime } from "@/lib/datetime";

type PostItem = {
  id: number;
  title: string;
  price: number | null;
  categoryName: string;
  thumbnailUrl?: string;
  createDate: string;
  status: string;
  statusDisplayName?: string;
  viewCount: number;
  sellerId?: number;
  sellerNickname?: string;
  sellerBadge?: string;
};

type PostPageData = {
  content?: PostItem[];
  totalPages?: number;
  totalElements?: number;
  currentStatusFilter?: string;
};

type SearchItem = {
  id: number;
  type?: string;
  title: string;
  price: number | null;
  status?: string;
  statusDisplayName?: string;
  categoryName?: string;
  thumbnailUrl?: string;
  createDate: string;
  viewCount?: number;
  sellerId?: number;
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

export default function PostsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState("LATEST");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [categoryInput, setCategoryInput] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [totalElements, setTotalElements] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const categoryNameFilter = useMemo(() => {
    if (categoryId !== null) {
      return CATEGORIES.find((item) => item.id === categoryId)?.name ?? null;
    }
    const trimmed = categoryInput.trim();
    return trimmed ? trimmed : null;
  }, [categoryId, categoryInput]);

  const visiblePosts = useMemo(() => {
    if (!categoryNameFilter) return posts;
    return posts.filter((post) => post.categoryName === categoryNameFilter);
  }, [posts, categoryNameFilter]);

  useEffect(() => {
    let isMounted = true;
    const fetchPosts = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("size", String(pageSize));
        if (sort === "LATEST") {
          params.set("sort", "createDate,desc");
        } else if (sort === "OLDEST") {
          params.set("sort", "createDate,asc");
        }
        if (statusFilter && statusFilter !== "all") {
          params.set("status", statusFilter);
        }
        if (categoryId !== null) {
          params.set("categoryId", String(categoryId));
        } else if (categoryInput.trim()) {
          params.set("category", categoryInput.trim());
        }
        const endpoint = keyword
          ? `/api/v1/search?keyword=${encodeURIComponent(keyword)}&${params.toString()}`
          : `/api/v1/posts?${params.toString()}`;
        const { rsData, errorMessage: apiError, response } = keyword
          ? await apiRequest<SearchResponse>(endpoint)
          : await apiRequest<PostPageData>(endpoint);
        if (!isMounted) return;
        if (!response.ok || apiError || !rsData) {
          setPosts([]);
          setErrorMessage(apiError || "목록을 불러오지 못했습니다.");
          return;
        }
        if (keyword) {
          const content = (rsData as { data?: SearchResponse }).data?.content ?? [];
          const filtered = content.filter(
            (item) => !item.type || item.type === "POST"
          );
          setPosts(
            filtered.map((item) => ({
              id: item.id,
              title: item.title,
              price: item.price,
              categoryName: item.categoryName ?? "-",
              thumbnailUrl: item.thumbnailUrl,
              createDate: item.createDate,
              status: item.status ?? "SALE",
              statusDisplayName: item.statusDisplayName,
              viewCount: item.viewCount ?? 0,
              sellerId: item.sellerId,
              sellerNickname: item.sellerNickname,
              sellerBadge: item.sellerBadge,
            }))
          );
          setTotalPages((rsData as { data?: SearchResponse }).data?.totalPages ?? null);
          setTotalElements(
            (rsData as { data?: SearchResponse }).data?.totalElements ?? null
          );
        } else {
          const data = (rsData as { data?: PostPageData }).data;
          setPosts(data?.content ?? []);
          setTotalPages(data?.totalPages ?? null);
          setTotalElements(data?.totalElements ?? null);
        }
      } catch {
        if (isMounted) {
          setPosts([]);
          setErrorMessage("네트워크 오류가 발생했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    fetchPosts();
    return () => {
      isMounted = false;
    };
  }, [page, sort, statusFilter, keyword, categoryId, categoryInput, pageSize]);

  const applySearch = () => {
    setKeyword(keywordInput.trim());
    setPage(0);
  };

  const resetFilters = () => {
    setKeywordInput("");
    setKeyword("");
    setStatusFilter("all");
    setCategoryInput("");
    setCategoryId(null);
    setPageSize(10);
    setPage(0);
  };

  const handleWrite = () => {
    if (auth?.me) {
      router.push("/posts/write");
      return;
    }
    router.push("/login");
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
                  categoryId === null
                    ? "2px solid var(--accent)"
                    : "1px solid var(--border)",
              }}
              onClick={() => {
                setCategoryId(null);
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
                    categoryId === item.id
                      ? "2px solid var(--accent)"
                      : "1px solid var(--border)",
                }}
                onClick={() => {
                  setCategoryId(item.id);
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
            <h1 style={{ marginTop: 0 }}>중고거래 목록</h1>
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
                  placeholder="제목, 내용으로 검색"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applySearch();
                  }}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="statusFilter">
                  상태
                </label>
                <select
                  id="statusFilter"
                  className="select"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(0);
                  }}
                >
                  <option value="all">전체</option>
                  <option value="sale">판매중</option>
                  <option value="reserved">예약중</option>
                  <option value="sold">판매완료</option>
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
                    setCategoryId(null);
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
                  value={pageSize}
                  onChange={(event) =>
                    setPageSize(Number(event.target.value) || 10)
                  }
                />
              </div>
            </div>
            <div className="actions" style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={applySearch}>
                검색 적용
              </button>
              <button className="btn btn-primary" onClick={handleWrite}>
                글 작성
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
            ) : visiblePosts.length === 0 ? (
              <EmptyState
                message={
                  categoryNameFilter
                    ? "해당 카테고리의 게시글이 없습니다."
                    : "검색 결과가 없습니다."
                }
              />
            ) : (
              <div className="grid-3">
                {visiblePosts.map((post) => (
                  <Link key={post.id} className="card" href={`/posts/${post.id}`}>
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
                    <div className="tag">{post.categoryName || "중고거래"}</div>
                    <h3 style={{ margin: "12px 0 6px" }}>{post.title}</h3>
                    <div className="muted">
                      {formatNumber(post.price)}원 ·{" "}
                      {post.statusDisplayName || getPostStatusLabel(post.status)}
                    </div>
                    <div className="muted" style={{ marginTop: 4 }}>
                      {formatDateTime(post.createDate)}
                    </div>
                    <div className="muted" style={{ marginTop: 6 }}>
                      조회 {formatNumber(post.viewCount)} · 판매자{" "}
                      {post.sellerNickname || "-"}
                    </div>
                    {post.sellerBadge ? (
                      <div className="tag" style={{ marginTop: 8 }}>
                        {post.sellerBadge}
                      </div>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
            {totalPages !== null ? (
              <div className="actions" style={{ marginTop: 16 }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                  disabled={page <= 0}
                >
                  이전
                </button>
                <span className="muted">
                  {page + 1} / {totalPages} (총 {totalElements ?? 0}건)
                </span>
                <button
                  className="btn btn-ghost"
                  onClick={() =>
                    setPage((prev) =>
                      totalPages ? Math.min(prev + 1, totalPages - 1) : prev + 1
                    )
                  }
                  disabled={totalPages !== null && page >= totalPages - 1}
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


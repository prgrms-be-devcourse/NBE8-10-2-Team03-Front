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
import { NumberPagination } from "@/components/ui/NumberPagination";
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
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [pageSize] = useState(12);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeyword(keywordInput.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [keywordInput]);

  const visiblePosts = useMemo(() => {
    const items = [...posts];
    if (sort === "PRICE_ASC") {
      items.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    } else if (sort === "PRICE_DESC") {
      items.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    }
    return items;
  }, [posts, sort]);

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
        } else {
          const data = (rsData as { data?: PostPageData }).data;
          setPosts(data?.content ?? []);
          setTotalPages(data?.totalPages ?? null);
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
  }, [page, sort, statusFilter, keyword, categoryId, pageSize]);

  const resetFilters = () => {
    setKeywordInput("");
    setStatusFilter("all");
    setCategoryId(null);
    setSort("LATEST");
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
      <div className="catalog-layout">
        <aside className="panel catalog-sidebar">
          <h2 style={{ marginTop: 0 }}>카테고리</h2>
          <div className="category-scroll">
            <button
              className="card category-chip"
              style={{
                border:
                  categoryId === null
                    ? "2px solid var(--accent)"
                    : "1px solid var(--border)",
              }}
              onClick={() => {
                setCategoryId(null);
                setPage(0);
              }}
            >
              전체
            </button>
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                className="card category-chip"
                style={{
                  border:
                    categoryId === item.id
                      ? "2px solid var(--accent)"
                      : "1px solid var(--border)",
                }}
                onClick={() => {
                  setCategoryId(item.id);
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
            <div className="list-toolbar">
              <div className="field">
                <label className="label" htmlFor="keyword">
                  검색어
                </label>
                <input
                  id="keyword"
                  className="input"
                  value={keywordInput}
                  onChange={(event) => setKeywordInput(event.target.value)}
                  placeholder="제목 또는 내용 검색"
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
                <label className="label" htmlFor="sort">
                  정렬
                </label>
                <select
                  id="sort"
                  className="select"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value);
                    setPage(0);
                  }}
                >
                  <option value="LATEST">최신 등록순</option>
                  <option value="OLDEST">오래된 등록순</option>
                  <option value="PRICE_ASC">가격 낮은순</option>
                  <option value="PRICE_DESC">가격 높은순</option>
                </select>
              </div>
            </div>
            <div className="actions" style={{ marginTop: 16 }}>
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
                  categoryId !== null
                    ? "해당 카테고리의 게시글이 없습니다."
                    : "검색 결과가 없습니다."
                }
              />
            ) : (
              <div className="grid-3">
                {visiblePosts.map((post) => (
                  <Link key={post.id} className="card market-card list-card" href={`/posts/${post.id}`}>
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        marginBottom: 12,
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "var(--bg-surface)",
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
                        <span className="thumb-empty">📦 이미지 준비 중</span>
                      )}
                    </div>
                    <div className="tag">{post.categoryName || "중고거래"}</div>
                    <h3 style={{ margin: "12px 0 6px" }}>{post.title}</h3>
                    <div className="list-price-row">
                      <span className="list-price">{formatNumber(post.price)}원</span>
                      <span className="tag">
                        {post.statusDisplayName || getPostStatusLabel(post.status)}
                      </span>
                    </div>
                    <div className="muted list-meta">
                      등록 {formatDateTime(post.createDate)}
                    </div>
                    <div className="muted list-meta">
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
              <div className="pager-wrap">
                <NumberPagination
                  page={page}
                  totalPages={totalPages}
                  onChange={(nextPage) => setPage(nextPage)}
                />
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

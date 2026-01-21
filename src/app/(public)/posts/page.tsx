"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { buildApiUrl, parseRsData } from "@/lib/api";

type PostItem = {
  id: number;
  title: string;
  price: number | null;
  categoryName: string;
  thumbnailUrl?: string;
  createDate: string;
  viewCount: number;
};

type PostPageData = {
  content?: PostItem[];
  totalPages?: number;
  totalElements?: number;
};

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString();
};

export default function PostsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState("LATEST");
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [totalElements, setTotalElements] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredPosts = useMemo(() => {
    if (!keyword.trim()) return posts;
    return posts.filter((post) =>
      post.title.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [keyword, posts]);

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
        }
        const response = await fetch(
          buildApiUrl(`/api/v1/posts?${params.toString()}`),
          { credentials: "include" }
        );
        const { rsData, errorMessage: apiError } =
          await parseRsData<PostPageData>(response);
        if (!isMounted) return;
        if (!response.ok || apiError || !rsData) {
          setPosts([]);
          setErrorMessage(apiError || "목록을 불러오지 못했습니다.");
          return;
        }
        setPosts(rsData.data?.content ?? []);
        setTotalPages(rsData.data?.totalPages ?? null);
        setTotalElements(rsData.data?.totalElements ?? null);
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
  }, [page]);

  const applySearch = () => {
    setKeyword(keywordInput.trim());
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
              placeholder="제목으로 검색"
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
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
              disabled
            >
              <option value="LATEST">최신순</option>
            </select>
            <span className="muted">정렬 옵션은 MVP에서 고정됩니다.</span>
          </div>
        </div>
        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={applySearch}>
            검색 적용
          </button>
          <button className="btn btn-ghost" onClick={handleWrite}>
            글 작성
          </button>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        {isLoading ? (
          <div className="card">
            <div className="skeleton" style={{ width: "70%" }} />
            <div className="skeleton" style={{ width: "90%", marginTop: 12 }} />
          </div>
        ) : errorMessage ? (
          <div className="error">{errorMessage}</div>
        ) : filteredPosts.length === 0 ? (
          <div className="empty">검색 결과가 없습니다.</div>
        ) : (
          <div className="grid-3">
            {filteredPosts.map((post) => (
              <Link key={post.id} className="card" href={`/posts/${post.id}`}>
                <div className="tag">{post.categoryName}</div>
                <h3 style={{ margin: "12px 0 6px" }}>{post.title}</h3>
                <div className="muted">
                  {formatNumber(post.price)}원 · {post.createDate} · 조회{" "}
                  {formatNumber(post.viewCount)}
                </div>
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
  );
}

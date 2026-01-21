"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { buildApiUrl, parseRsData } from "@/lib/api";

type PostDetail = {
  id: number;
  title: string;
  content: string;
  price: number;
  status: string;
  categoryName: string;
  sellerNickname: string;
  imageUrls: string[];
  createDate: string;
};

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const auth = useAuth();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const postId = useMemo(() => {
    const raw = params?.id;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value ? Number(value) : null;
  }, [params]);

  const isSeller = useMemo(() => {
    if (!auth?.me || !post) return false;
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
        const response = await fetch(buildApiUrl(`/api/v1/posts/${postId}`), {
          credentials: "include",
        });
        const { rsData, errorMessage: apiError } =
          await parseRsData<PostDetail>(response);
        if (!isMounted) return;
        if (!response.ok || apiError || !rsData) {
          setPost(null);
          setErrorMessage(apiError || "상세 정보를 불러오지 못했습니다.");
          return;
        }
        setPost(rsData.data);
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
      const response = await fetch(buildApiUrl(`/api/v1/posts/${postId}`), {
        method: "DELETE",
        credentials: "include",
      });
      const { rsData, errorMessage: apiError } =
        await parseRsData<{ id: number }>(response);
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

  const handleChat = () => {
    if (!auth?.me) {
      router.push("/login");
      return;
    }
    router.push("/chat");
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
          <Link className="btn btn-ghost" href="/posts">
            목록으로 이동
          </Link>
        </div>
      </div>
    );
  }

  if (!post) {
    return <div className="empty">존재하지 않는 게시글입니다.</div>;
  }

  return (
    <div className="page">
      <section className="grid-2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>이미지</h2>
          {post.imageUrls?.length ? (
            <div className="grid-2">
              {post.imageUrls.map((url, index) => (
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
          <h1 style={{ marginTop: 0 }}>{post.title}</h1>
          <div className="tag">{post.categoryName}</div>
          <p style={{ marginTop: 12 }}>{post.content}</p>
          <div className="muted">
            {post.price.toLocaleString()}원 · {post.status} · {post.createDate}
          </div>
          <div style={{ marginTop: 16 }}>
            판매자: <strong>{post.sellerNickname}</strong>
          </div>
          <div className="actions" style={{ marginTop: 20 }}>
            <button className="btn btn-primary" onClick={handleChat}>
              채팅 시작
            </button>
            {isSeller ? (
              <>
                <button className="btn btn-ghost" disabled>
                  수정(준비중)
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
        </div>
      </section>
    </div>
  );
}

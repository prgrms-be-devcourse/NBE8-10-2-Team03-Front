"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { buildApiUrl, parseFieldErrors, parseRsData } from "@/lib/api";

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

const resolveImageUrl = (url: string) => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return buildApiUrl(url);
};

export default function PostEditPage() {
  const router = useRouter();
  const params = useParams();
  const [form, setForm] = useState({
    categoryId: "",
    title: "",
    content: "",
    price: "",
    images: [] as File[],
  });
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [keepImageUrls, setKeepImageUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(
    null
  );

  const postId = useMemo(() => {
    const raw = params?.id;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value ? Number(value) : null;
  }, [params]);

  const updateField = (key: keyof typeof form, value: string | File[]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

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
          setErrorMessage(apiError || "상세 정보를 불러오지 못했습니다.");
          return;
        }
        const data = rsData.data;
        setForm({
          categoryId: "",
          title: data.title ?? "",
          content: data.content ?? "",
          price: typeof data.price === "number" ? String(data.price) : "",
          images: [],
        });
        const urls = data.imageUrls ?? [];
        setExistingImageUrls(urls);
        setKeepImageUrls(urls);
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

  const validate = () => {
    const errors: Record<string, string> = {};
    const title = form.title.trim();
    const content = form.content.trim();
    const categoryId = Number(form.categoryId);
    const price = form.price ? Number(form.price) : null;

    if (!form.categoryId || Number.isNaN(categoryId)) {
      errors.categoryId = "카테고리를 입력해 주세요.";
    }
    if (!title) errors.title = "제목은 필수입니다.";
    if (!content) errors.content = "내용은 필수입니다.";
    if (form.price && (Number.isNaN(price) || price === null || price < 0)) {
      errors.price = "가격은 0 이상 숫자여야 합니다.";
    }
    setFieldErrors(Object.keys(errors).length ? errors : null);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!postId || !validate()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldErrors(null);
    const title = form.title.trim();
    const content = form.content.trim();
    const categoryId = Number(form.categoryId);
    const price = form.price ? Number(form.price) : null;

    const body = new FormData();
    body.append("title", title);
    body.append("content", content);
    body.append("categoryId", String(categoryId));
    if (price !== null) body.append("price", String(price));
    keepImageUrls.forEach((url) => body.append("keepImageUrls", url));
    form.images.forEach((file) => body.append("images", file));

    try {
      const response = await fetch(buildApiUrl(`/api/v1/posts/${postId}`), {
        method: "PATCH",
        credentials: "include",
        body,
      });
      const { rsData, errorMessage: apiError } =
        await parseRsData<{ id: number }>(response);
      if (!response.ok || !rsData || apiError) {
        if (rsData?.resultCode === "400-1" && rsData.msg) {
          setFieldErrors(parseFieldErrors(rsData.msg));
        } else {
          setErrorMessage(apiError || rsData?.msg || "수정에 실패했습니다.");
        }
        return;
      }
      router.push(`/posts/${postId}`);
    } catch {
      setErrorMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleKeepImage = (url: string) => {
    setKeepImageUrls((prev) =>
      prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url]
    );
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
          <button className="btn btn-ghost" onClick={() => router.back()}>
            뒤로가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>중고거래 수정</h1>
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div className="field-row">
            <div className="field">
              <label className="label" htmlFor="categoryId">
                카테고리 ID
              </label>
              <input
                id="categoryId"
                className="input"
                value={form.categoryId}
                onChange={(event) => updateField("categoryId", event.target.value)}
                placeholder="예: 1"
              />
              {fieldErrors?.categoryId ? (
                <span className="error">{fieldErrors.categoryId}</span>
              ) : null}
            </div>
            <div className="field">
              <label className="label" htmlFor="price">
                가격(선택)
              </label>
              <input
                id="price"
                className="input"
                value={form.price}
                onChange={(event) => updateField("price", event.target.value)}
                placeholder="0 이상"
              />
              {fieldErrors?.price ? (
                <span className="error">{fieldErrors.price}</span>
              ) : null}
            </div>
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label className="label" htmlFor="title">
              제목
            </label>
            <input
              id="title"
              className="input"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="제목을 입력하세요"
            />
            {fieldErrors?.title ? (
              <span className="error">{fieldErrors.title}</span>
            ) : null}
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label className="label" htmlFor="content">
              내용
            </label>
            <textarea
              id="content"
              className="textarea"
              rows={6}
              value={form.content}
              onChange={(event) => updateField("content", event.target.value)}
              placeholder="상품 설명을 입력하세요"
            />
            {fieldErrors?.content ? (
              <span className="error">{fieldErrors.content}</span>
            ) : null}
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label className="label">기존 이미지</label>
            {existingImageUrls.length === 0 ? (
              <div className="empty">등록된 이미지가 없습니다.</div>
            ) : (
              <div className="grid-2">
                {existingImageUrls.map((url) => {
                  const resolvedUrl = resolveImageUrl(url);
                  const checked = keepImageUrls.includes(url);
                  return (
                    <label key={url} className="panel">
                      <img
                        alt="게시글 이미지"
                        src={resolvedUrl}
                        style={{ width: "100%", borderRadius: 12 }}
                      />
                      <div style={{ marginTop: 8 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleKeepImage(url)}
                        />{" "}
                        유지
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label className="label" htmlFor="images">
              새 이미지(선택)
            </label>
            <input
              id="images"
              className="input"
              type="file"
              multiple
              onChange={(event) =>
                updateField("images", Array.from(event.target.files ?? []))
              }
            />
          </div>
          {errorMessage ? (
            <div className="error" style={{ marginTop: 12 }}>
              {errorMessage}
            </div>
          ) : null}
          <div className="actions" style={{ marginTop: 20 }}>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "수정 중..." : "수정"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => router.back()}
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

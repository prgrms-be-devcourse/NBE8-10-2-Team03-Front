"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest, parseFieldErrors } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { CATEGORIES } from "@/lib/categories";

export default function PostWritePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    categoryId: "",
    title: "",
    content: "",
    price: "",
    images: [] as File[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(
    null
  );

  const updateField = (key: keyof typeof form, value: string | File[]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    const title = form.title.trim();
    const content = form.content.trim();
    const categoryId = Number(form.categoryId);
    const price = form.price ? Number(form.price) : null;

    if (!form.categoryId || Number.isNaN(categoryId)) {
      errors.categoryId = "카테고리를 입력해 주세요.";
    }
    if (!title) {
      errors.title = "제목은 필수입니다.";
    } else if (title.length < 2 || title.length > 50) {
      errors.title = "제목은 2자 이상 50자 이하로 입력해 주세요.";
    }
    if (!content) {
      errors.content = "내용은 필수입니다.";
    } else if (content.length < 10 || content.length > 1000) {
      errors.content = "내용은 10자 이상 1000자 이하로 입력해 주세요.";
    }
    if (form.price && (Number.isNaN(price) || price === null || price < 0)) {
      errors.price = "가격은 0 이상 숫자여야 합니다.";
    }
    setFieldErrors(Object.keys(errors).length ? errors : null);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
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
    form.images.forEach((file) => body.append("images", file));

    try {
      const { rsData, errorMessage: apiError, response } =
        await apiRequest<{ id: number }>("/api/v1/posts", {
          method: "POST",
          body,
        });
      if (!response.ok || !rsData || apiError) {
        if (rsData?.resultCode === "400-1" && rsData.msg) {
          const parsed = parseFieldErrors(rsData.msg);
          if (Object.keys(parsed).length > 0) {
            setFieldErrors(parsed);
          } else {
            setErrorMessage(rsData.msg);
          }
        } else {
          setErrorMessage(apiError || rsData?.msg || "등록에 실패했습니다.");
        }
        return;
      }
      router.push(`/posts/${rsData.data?.id}`);
    } catch {
      setErrorMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page">
      <Card>
        <h1 style={{ marginTop: 0 }}>중고거래 작성</h1>
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div className="field-row">
            <div className="field">
              <label className="label" htmlFor="categoryId">
                카테고리
              </label>
              <select
                id="categoryId"
                className="select"
                value={form.categoryId}
                onChange={(event) => updateField("categoryId", event.target.value)}
              >
                <option value="">선택하세요</option>
                {CATEGORIES.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.name}
                  </option>
                ))}
              </select>
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
              placeholder="제목을 입력해 주세요"
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
              placeholder="상품 설명을 입력해 주세요"
            />
            {fieldErrors?.content ? (
              <span className="error">{fieldErrors.content}</span>
            ) : null}
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label className="label" htmlFor="images">
              이미지(선택)
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
            <ErrorMessage message={errorMessage} style={{ marginTop: 12 }} />
          ) : null}
          <div className="actions" style={{ marginTop: 20 }}>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "등록 중..." : "등록"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => router.push("/posts")}
            >
              취소
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

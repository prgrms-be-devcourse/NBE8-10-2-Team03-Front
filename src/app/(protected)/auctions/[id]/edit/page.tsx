"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { apiRequest, buildApiUrl, parseFieldErrors } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SkeletonLine } from "@/components/ui/SkeletonLine";
import { CATEGORIES } from "@/lib/categories";

type AuctionDetail = {
  auctionId: number;
  name: string;
  description: string;
  startPrice: number | null;
  currentHighestBid: number | null;
  buyNowPrice?: number | null;
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

const resolveImageUrl = (url: string) => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return buildApiUrl(url);
};

const toInputDateTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function AuctionEditPage() {
  const router = useRouter();
  const params = useParams();
  const auth = useAuth();
  const [form, setForm] = useState({
    name: "",
    description: "",
    startPrice: "",
    buyNowPrice: "",
    endAt: "",
    categoryId: "",
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
  const [isEditable, setIsEditable] = useState(true);

  const auctionId = useMemo(() => {
    const raw = params?.id;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value ? Number(value) : null;
  }, [params]);

  const updateField = (key: keyof typeof form, value: string | File[]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

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
        const { rsData, errorMessage: apiError, response } =
          await apiRequest<AuctionDetail>(`/api/v1/auctions/${auctionId}`);
        if (!isMounted) return;
        if (!response.ok || apiError || !rsData) {
          setErrorMessage("잘못된 접근입니다.");
          return;
        }
        const data = rsData.data;
        const editable =
          data.bidCount === 0 ||
          data.currentHighestBid === null ||
          data.currentHighestBid === undefined;
        const sellerOk = auth?.me?.id === data.seller.id;
        setIsEditable(editable && sellerOk);
        if (!sellerOk) {
          setErrorMessage("잘못된 접근입니다.");
          return;
        }
        if (!editable) {
          setErrorMessage("잘못된 접근입니다.");
          return;
        }
        const resolvedCategoryId =
          CATEGORIES.find((item) => item.name === data.categoryName)?.id ?? null;
        setForm({
          name: data.name ?? "",
          description: data.description ?? "",
          startPrice:
            typeof data.startPrice === "number" ? String(data.startPrice) : "",
          buyNowPrice:
            typeof data.buyNowPrice === "number" ? String(data.buyNowPrice) : "",
          endAt: toInputDateTime(data.endAt),
          categoryId: resolvedCategoryId ? String(resolvedCategoryId) : "",
          images: [],
        });
        const urls = data.imageUrls ?? [];
        setExistingImageUrls(urls);
        setKeepImageUrls(urls);
      } catch {
        if (isMounted) {
          setErrorMessage("잘못된 접근입니다.");
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
  }, [auctionId, auth?.me?.id]);

  const validate = () => {
    const errors: Record<string, string> = {};
    const name = form.name.trim();
    const description = form.description.trim();
    const startPrice = Number(form.startPrice);
    const buyNowPrice = form.buyNowPrice ? Number(form.buyNowPrice) : null;
    const categoryId = Number(form.categoryId);

    if (!name) errors.name = "상품명은 필수입니다.";
    if (!description) errors.description = "설명은 필수입니다.";
    if (Number.isNaN(startPrice) || startPrice < 0) {
      errors.startPrice = "시작가는 0 이상 숫자여야 합니다.";
    }
    if (
      form.buyNowPrice &&
      (buyNowPrice === null || Number.isNaN(buyNowPrice) || buyNowPrice < 0)
    ) {
      errors.buyNowPrice = "즉시구매가는 0 이상 숫자여야 합니다.";
    }
    if (!form.categoryId || Number.isNaN(categoryId)) {
      errors.categoryId = "카테고리는 필수입니다.";
    }
    setFieldErrors(Object.keys(errors).length ? errors : null);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!auctionId || !isEditable || !validate()) return;
    setIsSubmitting(true);
    setErrorMessage("잘못된 접근입니다.");
    setFieldErrors(null);

    const body = new FormData();
    body.append("name", form.name.trim());
    body.append("description", form.description.trim());
    body.append("startPrice", String(Number(form.startPrice)));
    if (form.buyNowPrice) {
      body.append("buyNowPrice", String(Number(form.buyNowPrice)));
    }
    body.append("categoryId", String(Number(form.categoryId)));
    if (form.endAt) {
      body.append("endAt", form.endAt);
    }
    keepImageUrls.forEach((url) => body.append("keepImageUrls", url));
    form.images.forEach((file) => body.append("images", file));

    try {
      const { rsData, errorMessage: apiError, response } =
        await apiRequest<{ auctionId: number }>(`/api/v1/auctions/${auctionId}`, {
          method: "PATCH",
          body,
        });
      if (!response.ok || !rsData || apiError) {
        if (rsData?.resultCode === "400-1" && rsData.msg) {
          setFieldErrors(parseFieldErrors(rsData.msg));
        } else {
          setErrorMessage("잘못된 접근입니다.");
        }
        return;
      }
      router.push(`/auctions/${auctionId}`);
    } catch {
      setErrorMessage("잘못된 접근입니다.");
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
          <button className="btn btn-ghost" onClick={() => router.back()}>
            뒤로가기
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="page">
      <Card>
        <h1 style={{ marginTop: 0 }}>경매 수정</h1>
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div className="field">
            <label className="label" htmlFor="name">
              상품명
            </label>
            <input
              id="name"
              className="input"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="경매 상품명"
            />
            {fieldErrors?.name ? (
              <span className="error">{fieldErrors.name}</span>
            ) : null}
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label className="label" htmlFor="description">
              설명
            </label>
            <textarea
              id="description"
              className="textarea"
              rows={6}
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
            />
            {fieldErrors?.description ? (
              <span className="error">{fieldErrors.description}</span>
            ) : null}
          </div>
          <div className="field-row" style={{ marginTop: 16 }}>
            <div className="field">
              <label className="label" htmlFor="startPrice">
                시작가
              </label>
              <input
                id="startPrice"
                className="input"
                value={form.startPrice}
                onChange={(event) =>
                  updateField("startPrice", event.target.value)
                }
                placeholder="0 이상"
              />
              {fieldErrors?.startPrice ? (
                <span className="error">{fieldErrors.startPrice}</span>
              ) : null}
            </div>
            <div className="field">
              <label className="label" htmlFor="buyNowPrice">
                즉시구매가(선택)
              </label>
              <input
                id="buyNowPrice"
                className="input"
                value={form.buyNowPrice}
                onChange={(event) =>
                  updateField("buyNowPrice", event.target.value)
                }
                placeholder="0 이상"
              />
              {fieldErrors?.buyNowPrice ? (
                <span className="error">{fieldErrors.buyNowPrice}</span>
              ) : null}
            </div>
            <div className="field">
              <label className="label" htmlFor="categoryId">
                카테고리
              </label>
              <select
                id="categoryId"
                className="select"
                value={form.categoryId}
                onChange={(event) =>
                  updateField("categoryId", event.target.value)
                }
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
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label className="label" htmlFor="endAt">
              종료 시간(선택)
            </label>
            <input
              id="endAt"
              className="input"
              type="datetime-local"
              value={form.endAt}
              onChange={(event) => updateField("endAt", event.target.value)}
            />
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label className="label">기존 이미지</label>
            {existingImageUrls.length === 0 ? (
              <EmptyState message="등록된 이미지가 없습니다." />
            ) : (
              <div className="grid-2">
                {existingImageUrls.map((url) => {
                  const resolvedUrl = resolveImageUrl(url);
                  const checked = keepImageUrls.includes(url);
                  return (
                    <label key={url} className="panel">
                      <img
                        alt="경매 이미지"
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
              추가 이미지(선택)
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
              disabled={isSubmitting || !isEditable}
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
      </Card>
    </div>
  );
}


















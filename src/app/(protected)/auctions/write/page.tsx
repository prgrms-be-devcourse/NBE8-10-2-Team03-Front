"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { apiRequest, parseFieldErrors } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

export default function AuctionWritePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    startPrice: "",
    buyNowPrice: "",
    categoryId: "",
    durationHours: "",
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

  const buyNowWarning = useMemo(() => {
    const startPrice = Number(form.startPrice);
    const buyNowPrice = Number(form.buyNowPrice);
    if (Number.isNaN(startPrice) || Number.isNaN(buyNowPrice)) return null;
    if (!form.buyNowPrice) return null;
    return buyNowPrice < startPrice
      ? "즉시구매가는 시작가보다 낮을 수 있습니다. 서버 검증을 확인하세요."
      : null;
  }, [form.buyNowPrice, form.startPrice]);

  const validate = () => {
    const errors: Record<string, string> = {};
    const name = form.name.trim();
    const description = form.description.trim();
    const startPrice = Number(form.startPrice);
    const buyNowPrice = form.buyNowPrice ? Number(form.buyNowPrice) : null;
    const categoryId = Number(form.categoryId);
    const durationHours = Number(form.durationHours);

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
    if (Number.isNaN(durationHours) || durationHours < 1) {
      errors.durationHours = "기간은 1시간 이상이어야 합니다.";
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

    const body = new FormData();
    body.append("name", form.name.trim());
    body.append("description", form.description.trim());
    body.append("startPrice", String(Number(form.startPrice)));
    if (form.buyNowPrice) {
      body.append("buyNowPrice", String(Number(form.buyNowPrice)));
    }
    body.append("categoryId", String(Number(form.categoryId)));
    body.append("durationHours", String(Number(form.durationHours)));
    form.images.forEach((file) => body.append("images", file));

    try {
      const { rsData, errorMessage: apiError, response } =
        await apiRequest<{ auctionId: number }>("/api/auctions", {
          method: "POST",
          body,
        });
      if (!response.ok || !rsData || apiError) {
        if (rsData?.resultCode === "400-1" && rsData.msg) {
          setFieldErrors(parseFieldErrors(rsData.msg));
        } else {
          setErrorMessage(apiError || rsData?.msg || "등록에 실패했습니다.");
        }
        return;
      }
      router.push(`/auctions/${rsData.data?.auctionId}`);
    } catch {
      setErrorMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page">
      <Card>
        <h1 style={{ marginTop: 0 }}>경매 등록</h1>
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
              {buyNowWarning ? (
                <span className="muted">{buyNowWarning}</span>
              ) : null}
            </div>
          </div>
          <div className="field-row" style={{ marginTop: 16 }}>
            <div className="field">
              <label className="label" htmlFor="categoryId">
                카테고리 ID
              </label>
              <input
                id="categoryId"
                className="input"
                value={form.categoryId}
                onChange={(event) =>
                  updateField("categoryId", event.target.value)
                }
                placeholder="예: 2"
              />
              {fieldErrors?.categoryId ? (
                <span className="error">{fieldErrors.categoryId}</span>
              ) : null}
            </div>
            <div className="field">
              <label className="label" htmlFor="durationHours">
                진행 시간(시간)
              </label>
              <input
                id="durationHours"
                className="input"
                value={form.durationHours}
                onChange={(event) =>
                  updateField("durationHours", event.target.value)
                }
                placeholder="예: 24"
              />
              {fieldErrors?.durationHours ? (
                <span className="error">{fieldErrors.durationHours}</span>
              ) : null}
            </div>
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
              onClick={() => router.push("/auctions")}
            >
              취소
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export type AuctionStatus = "OPEN" | "CLOSED" | "COMPLETED" | "CANCELLED";
export type PostStatus = "SALE" | "RESERVED" | "SOLD";

const AUCTION_STATUS_LABELS: Record<AuctionStatus, string> = {
  OPEN: "진행 중",
  CLOSED: "입찰 없음",
  COMPLETED: "낙찰 완료",
  CANCELLED: "취소됨",
};

const POST_STATUS_LABELS: Record<PostStatus, string> = {
  SALE: "판매 중",
  RESERVED: "예약 중",
  SOLD: "판매 완료",
};

export function getAuctionStatusLabel(status?: string | null): string {
  if (!status) return "-";
  return AUCTION_STATUS_LABELS[status as AuctionStatus] ?? status;
}

export function getPostStatusLabel(status?: string | null): string {
  if (!status) return "-";
  return POST_STATUS_LABELS[status as PostStatus] ?? status;
}

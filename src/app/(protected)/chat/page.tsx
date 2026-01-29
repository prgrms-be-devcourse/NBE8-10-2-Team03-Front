"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useSearchParams } from "next/navigation";
import { apiRequest, buildApiUrl, getAuthHeaders, safeJson } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Panel } from "@/components/ui/Panel";
import { SkeletonLine } from "@/components/ui/SkeletonLine";
import { formatDateTime } from "@/lib/datetime";

type ChatDto = {
  id?: number;
  itemId: number;
  roomId: string;
  sender?: string;
  senderId?: number;
  message: string;
  imageUrls?: string[];
  createDate: string;
  isRead: boolean;
};

type ChatListItem = {
  roomId: string;
  itemId: number;
  opponentId?: number;
  opponentNickname?: string;
  opponentProfileImageUrl?: string;
  lastMessage?: string;
  lastMessageDate?: string;
  unreadCount?: number;
  itemName?: string;
  itemImageUrl?: string;
  itemPrice?: number;
  txType?: "AUCTION" | "POST";
};

type RoomSummary = {
  roomId: string;
  itemId: number;
  opponentId?: number;
  opponentNickname?: string;
  opponentProfileImageUrl?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  itemName?: string;
  itemImageUrl?: string;
  itemPrice?: number;
  txType?: "AUCTION" | "POST";
};

const toTimestamp = (value?: string) =>
  value ? new Date(value).getTime() : 0;

const resolveImageUrl = (url: string) => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return buildApiUrl(url);
};

export default function ChatPage() {
  const searchParams = useSearchParams();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatDto[]>([]);
  const [messageText, setMessageText] = useState("");
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [isRoomsLoading, setIsRoomsLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [messagesRefreshTick, setMessagesRefreshTick] = useState(0);
  const [selectedImagesError, setSelectedImagesError] = useState<string | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const lastChatIdRef = useRef<number | null>(null);
  const [isOlderLoading, setIsOlderLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewStar, setReviewStar] = useState("5");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewRefreshTick, setReviewRefreshTick] = useState(0);

  const pendingRoomId = searchParams?.get("roomId");
  const pendingItemId = searchParams?.get("itemId");

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.roomId === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  const reviewStorageKey = useMemo(() => {
    if (!selectedRoomId || !selectedRoom?.opponentId) return null;
    return `reviewed:${selectedRoomId}:${selectedRoom.opponentId}`;
  }, [selectedRoomId, selectedRoom?.opponentId]);

  useEffect(() => {
    if (!reviewStorageKey || typeof window === "undefined") {
      setHasReviewed(false);
      return;
    }
    setHasReviewed(localStorage.getItem(reviewStorageKey) === "1");
  }, [reviewStorageKey, reviewRefreshTick]);

  useEffect(() => {
    if (pendingRoomId && !selectedRoomId) {
      setSelectedRoomId(pendingRoomId);
    }
  }, [pendingRoomId, selectedRoomId]);

  useEffect(() => {
    let isMounted = true;
    const fetchRooms = async () => {
      setIsRoomsLoading(true);
      setRoomsError(null);
      try {
        const { rsData, errorMessage, response } =
          await apiRequest<ChatListItem[]>("/api/v1/chat/list");
        if (!response.ok) {
          setRoomsError("채팅 목록을 불러오지 못했습니다.");
          return;
        }
        if (!rsData) {
          setRoomsError(errorMessage || "응답 파싱에 실패했습니다.");
          return;
        }
        if (!isMounted) return;
        const roomItems = rsData.data || [];
        const mappedRooms = roomItems.map((room) => ({
          roomId: room.roomId,
          itemId: room.itemId,
          opponentId: room.opponentId,
          opponentNickname: room.opponentNickname,
          opponentProfileImageUrl: room.opponentProfileImageUrl,
          lastMessage: room.lastMessage,
          lastMessageAt: room.lastMessageDate,
          unreadCount: room.unreadCount,
          itemName: room.itemName,
          itemImageUrl: room.itemImageUrl,
          itemPrice: room.itemPrice,
          txType: room.txType,
        }));
        const sortedRooms = [...mappedRooms].sort(
          (a, b) => toTimestamp(b.lastMessageAt) - toTimestamp(a.lastMessageAt)
        );
        if (
          pendingRoomId &&
          !sortedRooms.some((room) => room.roomId === pendingRoomId)
        ) {
          const parsedItemId = pendingItemId ? Number(pendingItemId) : 0;
          const itemId = Number.isFinite(parsedItemId) ? parsedItemId : 0;
          setRooms([
            {
              roomId: pendingRoomId,
              itemId,
              lastMessage: "새 채팅방",
              lastMessageAt: "",
              unreadCount: 0,
            },
            ...sortedRooms,
          ]);
        } else {
          setRooms(sortedRooms);
        }
      } catch {
        if (isMounted) {
          setRoomsError("네트워크 오류가 발생했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsRoomsLoading(false);
        }
      }
    };
    fetchRooms();
    return () => {
      isMounted = false;
    };
  }, [pendingRoomId, pendingItemId]);

  useEffect(() => {
    if (!selectedRoomId) {
      setMessages([]);
      return;
    }
    setMessageText("");
    setPendingImages([]);
    setSelectedImagesError(null);
    setSendError(null);
    setIsReviewOpen(false);
    setReviewError(null);
    setReviewSuccess(null);
    let isMounted = true;
    const fetchMessages = async () => {
      setIsMessagesLoading(true);
      setMessagesError(null);
      setHasMoreMessages(true);
      try {
        const { rsData, errorMessage, response } =
          await apiRequest<ChatDto[]>(`/api/v1/chat/room/${selectedRoomId}`);
        if (!response.ok) {
          setMessagesError("메시지를 불러오지 못했습니다.");
          return;
        }
        if (!rsData) {
          setMessagesError(errorMessage || "응답 파싱에 실패했습니다.");
          return;
        }
        if (!isMounted) return;
        const nextMessages = rsData.data || [];
        setMessages(nextMessages);
        const oldest = nextMessages[0]?.id ?? null;
        lastChatIdRef.current = typeof oldest === "number" ? oldest : null;
        setHasMoreMessages(nextMessages.length > 0);
      } catch {
        if (isMounted) {
          setMessagesError("네트워크 오류가 발생했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsMessagesLoading(false);
        }
      }
    };
    fetchMessages();
    return () => {
      isMounted = false;
    };
  }, [selectedRoomId, messagesRefreshTick]);

  useEffect(() => {
    if (!selectedRoomId) return;
    if (!shouldAutoScroll) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    const scrollToBottom = () => {
      container.scrollTo({ top: container.scrollHeight, behavior: "auto" });
    };
    scrollToBottom();
    requestAnimationFrame(scrollToBottom);
  }, [messages, selectedRoomId, shouldAutoScroll]);

  const handleSend = async () => {
    if (
      !selectedRoomId ||
      (!messageText.trim() && !pendingImages.length) ||
      isSending
    ) {
      return;
    }
    setIsSending(true);
    setSendError(null);
    try {
      const formData = new FormData();
      formData.append("roomId", selectedRoomId);
      if (messageText.trim()) {
        formData.append("message", messageText.trim());
      }
      pendingImages.forEach((file) => {
        formData.append("images", file);
      });
      const response = await fetch(buildApiUrl("/api/v1/chat/send"), {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: formData,
      });
      if (!response.ok) {
        const raw = await response.text();
        let serverMessage = "";
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as { msg?: string; message?: string };
            serverMessage = parsed.msg || parsed.message || "";
          } catch {
            serverMessage = raw.trim();
          }
        }
        setSendError(serverMessage || "메시지 전송에 실패했습니다.");
        return;
      }
      const json = await safeJson<{
        resultCode?: string;
        msg?: string;
        data?: { chatId?: number };
      }>(response);
      const chatId =
        typeof json?.data?.chatId === "number" ? json.data.chatId : null;
      const nowIso = new Date().toISOString();
      const optimisticMessage: ChatDto = {
        id: chatId ?? Date.now() * -1,
        roomId: selectedRoomId,
        itemId: selectedRoom?.itemId ?? Number(pendingItemId ?? 0) ?? 0,
        message: messageText.trim(),
        createDate: nowIso,
        isRead: false,
      };
      setMessages((prev) => {
        if (chatId && prev.some((msg) => msg.id === chatId)) {
          return prev;
        }
        return [...prev, optimisticMessage];
      });
      setRooms((prev) => {
        const next = prev.map((room) =>
          room.roomId === selectedRoomId
            ? {
                ...room,
                lastMessage: optimisticMessage.message,
                lastMessageAt: nowIso,
                unreadCount: 0,
              }
            : room
        );
        return next.sort(
          (a, b) => toTimestamp(b.lastMessageAt) - toTimestamp(a.lastMessageAt)
        );
      });
      setMessageText("");
      setPendingImages([]);
    } catch {
      setSendError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSending(false);
    }
  };

  const handleLoadOlder = async () => {
    if (!selectedRoomId || isOlderLoading || !hasMoreMessages) return;
    const lastChatId = lastChatIdRef.current;
    setIsOlderLoading(true);
    setMessagesError(null);
    try {
      const params = new URLSearchParams();
      if (lastChatId) {
        params.set("lastChatId", String(lastChatId));
      }
      const { rsData, errorMessage, response } =
        await apiRequest<ChatDto[]>(
          `/api/v1/chat/room/${selectedRoomId}?${params.toString()}`
        );
      if (!response.ok || !rsData) {
        setMessagesError(errorMessage || "메시지를 불러오지 못했습니다.");
        return;
      }
      const older = rsData.data || [];
      if (older.length === 0) {
        setHasMoreMessages(false);
        return;
      }
      setMessages((prev) => [...older, ...prev]);
      const oldest = older[0]?.id ?? null;
      lastChatIdRef.current = typeof oldest === "number" ? oldest : null;
    } catch {
      setMessagesError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsOlderLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!selectedRoom?.opponentId || hasReviewed || isReviewSubmitting) return;
    const star = Number(reviewStar);
    if (!Number.isFinite(star) || star < 1 || star > 5) {
      setReviewError("별점은 1~5 사이여야 합니다.");
      return;
    }
    setIsReviewSubmitting(true);
    setReviewError(null);
    setReviewSuccess(null);
    try {
      const { rsData, errorMessage, response } = await apiRequest<null>(
        `/api/v1/members/${selectedRoom.opponentId}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            star,
            comment: reviewComment.trim() || null,
          }),
        }
      );
      if (!response.ok || errorMessage || !rsData) {
        setReviewError(errorMessage || rsData?.msg || "리뷰 등록에 실패했습니다.");
        return;
      }
      if (reviewStorageKey && typeof window !== "undefined") {
        localStorage.setItem(reviewStorageKey, "1");
      }
      setReviewSuccess(rsData.msg || "리뷰 작성이 완료되었습니다.");
      setHasReviewed(true);
      setReviewRefreshTick((prev) => prev + 1);
      setIsReviewOpen(false);
    } catch {
      setReviewError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  useEffect(() => {
    if (!selectedRoomId) return;
    if (typeof window === "undefined") return;
    const accessToken =
      localStorage.getItem("wsAccessToken")?.trim() ||
      localStorage.getItem("accessToken")?.trim() ||
      "";
    if (!accessToken) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(buildApiUrl("/ws")),
      connectHeaders: {
        token: `Bearer ${accessToken}`,
      },
      reconnectDelay: 5000,
      debug: (message) => {
        console.log("[stomp]", message);
      },
      onStompError: (frame) => {
        console.error("[stomp:error]", frame.headers["message"], frame.body);
      },
      onWebSocketClose: (event) => {
        console.warn("[stomp:ws-close]", event.code, event.reason);
      },
      onConnect: () => {
        client.subscribe(`/sub/v1/chat/room/${selectedRoomId}`, (message) => {
          if (!message.body) return;
          try {
            const parsed = JSON.parse(message.body) as
              | ChatDto
              | { resultCode?: string; msg?: string; data?: ChatDto };
            const data = (parsed as { data?: ChatDto }).data ?? (parsed as ChatDto);
            if (!data) return;
            if (data.roomId && data.roomId !== selectedRoomId) return;
            const normalized: ChatDto = {
              ...data,
              id: data.id ?? undefined,
              roomId: data.roomId ?? selectedRoomId,
            };
            setMessages((prev) => {
              if (normalized.id && prev.some((msg) => msg.id === normalized.id)) {
                return prev;
              }
              return [...prev, normalized];
            });
            setRooms((prev) => {
              const next = prev.map((room) =>
                room.roomId === selectedRoomId
                  ? {
                      ...room,
                      lastMessage: normalized.message,
                      lastMessageAt: normalized.createDate,
                      unreadCount: 0,
                    }
                  : room
              );
              return next.sort(
                (a, b) => toTimestamp(b.lastMessageAt) - toTimestamp(a.lastMessageAt)
              );
            });
          } catch {
            // ignore malformed messages
          }
        });
      },
    });

    client.activate();
    return () => {
      client.deactivate();
    };
  }, [selectedRoomId]);

  return (
    <div className="page">
      <div className="split">
        <Card>
          <h2 style={{ marginTop: 0 }}>채팅 목록</h2>
          {isRoomsLoading ? (
            <>
              <SkeletonLine width="70%" />
              <SkeletonLine width="90%" style={{ marginTop: 12 }} />
            </>
          ) : roomsError ? (
            <ErrorMessage message={roomsError} />
          ) : rooms.length === 0 ? (
            <EmptyState message="채팅방이 없습니다." />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {rooms.map((room) => (
                <button
                  key={room.roomId}
                  className="card"
                  style={{
                    textAlign: "left",
                    border:
                      selectedRoomId === room.roomId
                        ? "2px solid var(--accent)"
                        : "1px solid var(--border)",
                  }}
                  onClick={() => setSelectedRoomId(room.roomId)}
                >
                  <div className="muted">
                    {room.opponentNickname
                      ? `상대: ${room.opponentNickname}`
                      : "상대 정보 없음"}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    {room.lastMessage || "마지막 메시지 없음"}
                  </div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {room.lastMessageAt
                      ? formatDateTime(room.lastMessageAt)
                      : "시간 정보 없음"}
                  </div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    방 ID: {room.roomId}
                  </div>
                  {room.unreadCount ? (
                    <div className="tag" style={{ marginTop: 8 }}>
                      미확인 {room.unreadCount}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 style={{ marginTop: 0 }}>메시지</h2>
          {!selectedRoomId ? (
            <EmptyState message="채팅방을 선택하세요." />
          ) : isMessagesLoading ? (
            <>
              <SkeletonLine width="70%" />
              <SkeletonLine width="90%" style={{ marginTop: 12 }} />
            </>
          ) : messagesError ? (
            <ErrorMessage message={messagesError} />
          ) : messages.length === 0 ? (
            <EmptyState message="메시지가 없습니다." />
          ) : (
            <div
              ref={messagesContainerRef}
              style={{
                display: "grid",
                gap: 12,
                maxHeight: "60vh",
                overflowY: "auto",
                paddingRight: 6,
              }}
              onScroll={(event) => {
                const target = event.currentTarget;
                const distanceFromBottom =
                  target.scrollHeight - target.scrollTop - target.clientHeight;
                setShouldAutoScroll(distanceFromBottom < 80);
              }}
            >
              {messages.map((message, index) => (
                <div key={`${message.id ?? index}-${message.createDate}`}>
                  <div className="muted">
                    {(message.sender ||
                      (message.senderId !== undefined
                        ? `#${message.senderId}`
                        : "알 수 없음"))}{" "}
                    · {formatDateTime(message.createDate)}
                  </div>
                  <div>{message.message}</div>
                  {message.imageUrls && message.imageUrls.length > 0 ? (
                    <div className="grid-2" style={{ marginTop: 8 }}>
                      {message.imageUrls.map((url, imgIndex) => (
                        <img
                          key={`${url}-${imgIndex}`}
                          src={resolveImageUrl(url)}
                          alt={`채팅 이미지 ${imgIndex + 1}`}
                          style={{ width: "100%", borderRadius: 8 }}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
          {selectedRoomId ? (
            <div style={{ marginTop: 16 }}>
              <Panel style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div className="muted">
                    리뷰 대상:{" "}
                    {selectedRoom?.opponentNickname ||
                      (selectedRoom?.opponentId
                        ? `회원 #${selectedRoom.opponentId}`
                        : "-")}
                  </div>
                  {hasReviewed ? (
                    <span className="tag">리뷰 완료</span>
                  ) : (
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => setIsReviewOpen((prev) => !prev)}
                    >
                      리뷰 남기기
                    </button>
                  )}
                </div>
                {isReviewOpen && !hasReviewed ? (
                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    <div className="field">
                      <label className="label" htmlFor="review-star">
                        별점
                      </label>
                      <select
                        id="review-star"
                        className="select"
                        value={reviewStar}
                        onChange={(event) => setReviewStar(event.target.value)}
                        disabled={isReviewSubmitting}
                      >
                        <option value="5">5점</option>
                        <option value="4">4점</option>
                        <option value="3">3점</option>
                        <option value="2">2점</option>
                        <option value="1">1점</option>
                      </select>
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="review-comment">
                        코멘트(선택)
                      </label>
                      <textarea
                        id="review-comment"
                        className="textarea"
                        rows={3}
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        placeholder="상대방에 대한 간단한 후기를 남겨주세요"
                        disabled={isReviewSubmitting}
                      />
                    </div>
                    {reviewError ? (
                      <ErrorMessage message={reviewError} />
                    ) : null}
                    {reviewSuccess ? (
                      <div className="success">{reviewSuccess}</div>
                    ) : null}
                    <div className="actions">
                      <button
                        className="btn btn-primary"
                        type="button"
                        onClick={handleReviewSubmit}
                        disabled={isReviewSubmitting}
                      >
                        {isReviewSubmitting ? "등록 중..." : "리뷰 등록"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </Panel>
              <div className="field">
                <label className="label" htmlFor="messageText">
                  메시지 입력
                </label>
                <textarea
                  id="messageText"
                  className="textarea"
                  rows={3}
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder="메시지를 입력하세요"
                />
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <label className="label" htmlFor="messageImages">
                  이미지 첨부
                </label>
                <input
                  id="messageImages"
                  className="input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    if (files.length > 10) {
                      setSelectedImagesError("이미지는 최대 10장까지 가능합니다.");
                      setPendingImages(files.slice(0, 10));
                      return;
                    }
                    setSelectedImagesError(null);
                    setPendingImages(files);
                  }}
                />
                {pendingImages.length > 0 ? (
                  <div className="muted" style={{ marginTop: 6 }}>
                    선택됨: {pendingImages.length}개
                  </div>
                ) : null}
                {selectedImagesError ? (
                  <ErrorMessage
                    message={selectedImagesError}
                    style={{ marginTop: 8 }}
                  />
                ) : null}
              </div>
              {sendError ? (
                <ErrorMessage message={sendError} style={{ marginTop: 8 }} />
              ) : null}
              <div className="actions" style={{ marginTop: 12 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSend}
                  disabled={
                    isSending || (!messageText.trim() && !pendingImages.length)
                  }
                >
                  {isSending ? "전송 중..." : "전송"}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setMessagesRefreshTick((prev) => prev + 1)}
                >
                  새로고침
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={handleLoadOlder}
                  disabled={isOlderLoading || !hasMoreMessages}
                >
                  {isOlderLoading ? "불러오는 중..." : "이전 메시지"}
                </button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}







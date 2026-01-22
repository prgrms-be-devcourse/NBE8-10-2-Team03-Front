"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import { apiRequest, buildApiUrl } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SkeletonLine } from "@/components/ui/SkeletonLine";

type ChatDto = {
  id?: number;
  itemId: number;
  roomId: string;
  sender: string;
  message: string;
  createDate: string;
  isRead: boolean;
};

type RoomSummary = {
  roomId: string;
  itemId: number;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
};

const toTimestamp = (value?: string) =>
  value ? new Date(value).getTime() : 0;

export default function ChatPage() {
  const auth = useAuth();
  const searchParams = useSearchParams();
  const [chatListRaw, setChatListRaw] = useState<ChatDto[]>([]);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatDto[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isRoomsLoading, setIsRoomsLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [messagesRefreshTick, setMessagesRefreshTick] = useState(0);

  const pendingRoomId = searchParams?.get("roomId");
  const pendingItemId = searchParams?.get("itemId");

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.roomId === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

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
          await apiRequest<ChatDto[]>("/api/chat/list");
        if (!response.ok) {
          setRoomsError("채팅 목록을 불러오지 못했습니다.");
          return;
        }
        if (!rsData) {
          setRoomsError(errorMessage || "응답 파싱에 실패했습니다.");
          return;
        }
        if (!isMounted) return;
        const roomChats = rsData.data || [];
        setChatListRaw(roomChats);
        const grouped = new Map<string, RoomSummary & { lastAt: number }>();
        for (const chat of roomChats) {
          const existing = grouped.get(chat.roomId);
          const currentTs = toTimestamp(chat.createDate);
          const unread = chat.isRead ? 0 : 1;
          if (!existing) {
            grouped.set(chat.roomId, {
              roomId: chat.roomId,
              itemId: chat.itemId,
              lastMessage: chat.message,
              lastMessageAt: chat.createDate,
              unreadCount: unread,
              lastAt: currentTs,
            });
          } else {
            existing.unreadCount = (existing.unreadCount || 0) + unread;
            if (currentTs >= existing.lastAt) {
              existing.lastAt = currentTs;
              existing.lastMessage = chat.message;
              existing.lastMessageAt = chat.createDate;
            }
          }
        }
        const sortedRooms = Array.from(grouped.values())
          .sort((a, b) => b.lastAt - a.lastAt)
          .map(({ lastAt, ...room }) => room);
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
    let isMounted = true;
    const fetchMessages = async () => {
      setIsMessagesLoading(true);
      setMessagesError(null);
      try {
        const { rsData, errorMessage, response } =
          await apiRequest<ChatDto[]>(`/api/chat/room/${selectedRoomId}`);
        if (!response.ok) {
          setMessagesError("메시지를 불러오지 못했습니다.");
          return;
        }
        if (!rsData) {
          setMessagesError(errorMessage || "응답 파싱에 실패했습니다.");
          return;
        }
        if (!isMounted) return;
        setMessages(rsData.data || []);
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

  const handleSend = async () => {
    if (!selectedRoomId || !messageText.trim() || isSending) return;
    const sender =
      auth?.me?.apiKey ||
      auth?.me?.username ||
      auth?.me?.name ||
      auth?.me?.id?.toString() ||
      "me";
    const itemId = selectedRoom?.itemId ?? 0;
    setIsSending(true);
    setSendError(null);
    try {
      const formData = new FormData();
      formData.append("id", "0");
      formData.append("itemId", itemId.toString());
      formData.append("roomId", selectedRoomId);
      formData.append("sender", sender);
      formData.append("message", messageText.trim());
      formData.append("createDate", "");
      formData.append("isRead", "false");
      const response = await fetch(buildApiUrl("/api/chat/send"), {
        method: "POST",
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
      setMessageText("");
      const { rsData } = await apiRequest<ChatDto[]>(
        `/api/chat/room/${selectedRoomId}`
      );
      if (rsData) {
        setMessages(rsData.data || []);
      }
    } catch {
      setSendError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSending(false);
    }
  };

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
                  <div className="muted">방 ID: {room.roomId}</div>
                  <div style={{ marginTop: 6 }}>{room.lastMessage}</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {room.lastMessageAt || "시간 정보 없음"}
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
            <div style={{ display: "grid", gap: 12 }}>
              {messages.map((message, index) => (
                <div key={`${message.id ?? index}-${message.createDate}`}>
                  <div className="muted">
                    {message.sender} · {message.createDate}
                  </div>
                  <div>{message.message}</div>
                </div>
              ))}
            </div>
          )}
          {selectedRoomId ? (
            <div style={{ marginTop: 16 }}>
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
              {sendError ? (
                <ErrorMessage message={sendError} style={{ marginTop: 8 }} />
              ) : null}
              <div className="actions" style={{ marginTop: 12 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSend}
                  disabled={isSending || !messageText.trim()}
                >
                  {isSending ? "전송 중..." : "전송"}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setMessagesRefreshTick((prev) => prev + 1)}
                >
                  새로고침
                </button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

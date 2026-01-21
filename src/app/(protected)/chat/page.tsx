"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { buildApiUrl, safeJson } from "@/lib/api";

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

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.roomId === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  useEffect(() => {
    let isMounted = true;
    const fetchRooms = async () => {
      setIsRoomsLoading(true);
      setRoomsError(null);
      try {
        const response = await fetch(buildApiUrl("/api/chat/list"), {
          credentials: "include",
        });
        if (!response.ok) {
          setRoomsError("채팅 목록을 불러오지 못했습니다.");
          return;
        }
        const json = await safeJson<ChatDto[]>(response);
        if (!json) {
          setRoomsError("응답 파싱에 실패했습니다.");
          return;
        }
        if (!isMounted) return;
        setChatListRaw(json);
        const grouped = new Map<string, RoomSummary & { lastAt: number }>();
        for (const chat of json) {
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
        setRooms(sortedRooms);
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
  }, []);

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
        const response = await fetch(
          buildApiUrl(`/api/chat/room/${selectedRoomId}`),
          {
          credentials: "include",
          }
        );
        if (!response.ok) {
          setMessagesError("메시지를 불러오지 못했습니다.");
          return;
        }
        const json = await safeJson<ChatDto[]>(response);
        if (!json) {
          setMessagesError("응답 파싱에 실패했습니다.");
          return;
        }
        if (!isMounted) return;
        setMessages(json);
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
      auth?.me?.username || auth?.me?.name || auth?.me?.id?.toString() || "me";
    const itemId = selectedRoom?.itemId ?? 0;
    setIsSending(true);
    setSendError(null);
    try {
      const response = await fetch(buildApiUrl("/api/chat/send"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          roomId: selectedRoomId,
          sender,
          message: messageText.trim(),
        }),
      });
      if (!response.ok) {
        setSendError("메시지 전송에 실패했습니다.");
        return;
      }
      setMessageText("");
      const refreshed = await fetch(
        buildApiUrl(`/api/chat/room/${selectedRoomId}`),
        {
        credentials: "include",
        }
      );
      const json = await safeJson<ChatDto[]>(refreshed);
      if (json) {
        setMessages(json);
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
        <div className="card">
          <h2 style={{ marginTop: 0 }}>채팅 목록</h2>
          {isRoomsLoading ? (
            <>
              <div className="skeleton" style={{ width: "70%" }} />
              <div className="skeleton" style={{ width: "90%", marginTop: 12 }} />
            </>
          ) : roomsError ? (
            <div className="error">{roomsError}</div>
          ) : rooms.length === 0 ? (
            <div className="empty">채팅방이 없습니다.</div>
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
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>메시지</h2>
          {!selectedRoomId ? (
            <div className="empty">채팅방을 선택하세요.</div>
          ) : isMessagesLoading ? (
            <>
              <div className="skeleton" style={{ width: "70%" }} />
              <div className="skeleton" style={{ width: "90%", marginTop: 12 }} />
            </>
          ) : messagesError ? (
            <div className="error">{messagesError}</div>
          ) : messages.length === 0 ? (
            <div className="empty">메시지가 없습니다.</div>
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
                <div className="error" style={{ marginTop: 8 }}>
                  {sendError}
                </div>
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
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiRequest, buildApiUrl, getAuthHeaders, safeJson } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthContext";

// ============================================
// Types
// ============================================

type ChatDto = {
    id?: number;
    itemId: number;
    roomId: string;
    senderId?: number;
    senderProfileImageUrl?: string;
    message: string;
    imageUrls?: string[];
    createDate: string;
    read?: boolean;
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

// ============================================
// Utilities
// ============================================

const toTimestamp = (value?: string) =>
    value ? new Date(value).getTime() : 0;

const DEFAULT_PROFILE_URL =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Ccircle cx='24' cy='24' r='24' fill='%23e0e0e0'/%3E%3Ccircle cx='24' cy='18' r='8' fill='%23bdbdbd'/%3E%3Cellipse cx='24' cy='38' rx='14' ry='10' fill='%23bdbdbd'/%3E%3C/svg%3E";

const resolveImageUrl = (url?: string) => {
    if (!url) return DEFAULT_PROFILE_URL;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return buildApiUrl(url);
};

const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "오후" : "오전";
    const displayHours = hours % 12 || 12;
    return `${ampm} ${displayHours}:${minutes}`;
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
};

const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return `${date.getMonth() + 1}/${date.getDate()}`;
};

const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return "가격 미정";
    return price.toLocaleString() + "원";
};

const isSameDay = (date1: string, date2: string) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
};

// ============================================
// Main Component
// ============================================

export default function ChatPage() {
    const searchParams = useSearchParams();
    const auth = useAuth();
    const me = auth?.me;
    const myId = me?.id;

    // State
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
    const [isOlderLoading, setIsOlderLoading] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [filterType, setFilterType] = useState<"ALL" | "POST" | "AUCTION">("ALL");
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Refs
    const messagesContainerRef = useRef<HTMLDivElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const lastChatIdRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const filterDropdownRef = useRef<HTMLDivElement | null>(null);

    const [wsToken, setWsToken] = useState<string | null>(null);
    const [isWsTokenLoading, setIsWsTokenLoading] = useState(false);

    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
    const [isExitModalOpen, setIsExitModalOpen] = useState(false);

    // URL params
    const pendingRoomId = searchParams?.get("roomId");
    const pendingItemId = searchParams?.get("itemId");
    const pendingTxType = searchParams?.get("txType") as "AUCTION" | "POST" | null;

    const selectedRoom = useMemo(
        () => rooms.find((r) => r.roomId === selectedRoomId),
        [rooms, selectedRoomId]
    );

    // 🚪 대화방 나가기 실행
    const handleLeaveRoom = async () => {
        if (!selectedRoomId) return;

        try {
            const { rsData, errorMessage } = await apiRequest<any>(`/api/v1/chat/room/${selectedRoomId}/exit`, {
                method: "PATCH",
            });

            if (errorMessage) {
                alert(errorMessage);
                return;
            }

            if (rsData?.resultCode?.startsWith("200")) {
                alert("대화방에서 퇴장하였습니다.");
                // 목록에서 제거 및 선택 해제
                setRooms((prev) => prev.filter((r) => r.roomId !== selectedRoomId));
                setSelectedRoomId(null);
                setIsExitModalOpen(false);
                setIsOptionsMenuOpen(false);
            }
        } catch (e) {
            console.error("Failed to leave room:", e);
            alert("문제가 발생했습니다. 다시 시도해 주세요.");
        }
    };

    // 필터링된 채팅방 목록
    const filteredRooms = useMemo(() => {
        if (filterType === "ALL") return rooms;
        return rooms.filter((room) => room.txType === filterType);
    }, [rooms, filterType]);

    // 필터 라벨
    const filterLabel = useMemo(() => {
        switch (filterType) {
            case "POST": return "중고거래";
            case "AUCTION": return "경매";
            default: return "전체 대화";
        }
    }, [filterType]);

    // '읽음' 상태 로직 (3단계):
    // - 전송됨: read=false (아직 읽지 않음)
    // - 읽음: read=true (상대방이 읽음)
    // - 공백: 상대방이 답장을 보낸 후 (내 이전 메시지들은 표시 안 함)
    const getReadStatus = useCallback(
        (message: ChatDto, index: number, allMessages: ChatDto[]): "sent" | "read" | "none" => {
            // 내 메시지가 아니면 표시 안 함
            if (!myId || message.senderId !== myId) return "none";

            // 이 메시지 이후에 상대방 메시지가 있는지 확인
            const hasOpponentReplyAfter = allMessages
                .slice(index + 1)
                .some((m) => m.senderId !== myId);

            // 상대방이 답장을 보낸 후라면 공백 (대화가 진행 중이므로 '읽음' 표시 불필요)
            if (hasOpponentReplyAfter) return "none";

            // 읽었으면 "읽음", 아니면 "전송됨"
            return message.read ? "read" : "sent";
        },
        [myId]
    );

    // Auto-select room from URL
    useEffect(() => {
        if (pendingRoomId && !selectedRoomId) {
            setSelectedRoomId(pendingRoomId);
        }
    }, [pendingRoomId, selectedRoomId]);

    // Close filter dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                filterDropdownRef.current &&
                !filterDropdownRef.current.contains(event.target as Node)
            ) {
                setIsFilterOpen(false);
            }
        };
        if (isFilterOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isFilterOpen]);

    // 채팅방 목록 가져오기 함수 (재사용 가능)
    const fetchRooms = useCallback(async (showLoading = true) => {
        if (showLoading) {
            setIsRoomsLoading(true);
            setRoomsError(null);
        }
        try {
            const { rsData, errorMessage, response } =
                await apiRequest<ChatListItem[]>("/api/v1/chat/list");
            if (!response.ok || !rsData) {
                if (showLoading) {
                    setRoomsError(errorMessage || "채팅 목록을 불러오지 못했습니다.");
                }
                return;
            }
            const roomItems = rsData.data || [];

            // 유효한 데이터만 필터링 (null 방지)
            const mappedRooms: RoomSummary[] = roomItems
                .filter((room) => room && room.roomId)
                .map((room) => ({
                    roomId: room.roomId,
                    itemId: room.itemId,
                    opponentId: room.opponentId,
                    opponentNickname: room.opponentNickname || "알 수 없음",
                    opponentProfileImageUrl: room.opponentProfileImageUrl,
                    lastMessage: room.lastMessage,
                    lastMessageAt: room.lastMessageDate,
                    unreadCount: room.unreadCount ?? 0,
                    itemName: room.itemName,
                    itemImageUrl: room.itemImageUrl,
                    itemPrice: room.itemPrice,
                    txType: room.txType,
                }));

            const sortedRooms = [...mappedRooms].sort(
                (a, b) => toTimestamp(b.lastMessageAt) - toTimestamp(a.lastMessageAt)
            );

            // 새 채팅방 URL 파라미터 처리 (백엔드 리스트에 없을 경우에만 기존 로직 사용하지만, 이제 백엔드가 줄 것임)
            if (pendingRoomId) {
                const existingRoom = sortedRooms.find((r) => r.roomId === pendingRoomId);

                if (!existingRoom) {
                    // 백엔드 리스트에 아직 없는 '갓 생성된' 방인 경우
                    const parsedItemId = pendingItemId ? Number(pendingItemId) : 0;
                    const newPlaceholder: RoomSummary = {
                        roomId: pendingRoomId,
                        itemId: Number.isFinite(parsedItemId) ? parsedItemId : 0,
                        lastMessage: "새 채팅방",
                        lastMessageAt: new Date().toISOString(), // 정렬을 위해 현재 시간 부여
                        unreadCount: 0,
                        opponentNickname: "불러오는 중...",
                        itemName: "상품 정보를 불러오는 중...",
                        txType: pendingTxType || "POST", // URL 파라미터 우선
                    };
                    setRooms([newPlaceholder, ...sortedRooms]);
                } else {
                    // 이미 리스트에 있으면 백엔드 데이터를 그대로 사용
                    setRooms(sortedRooms);
                }
            } else {
                setRooms(sortedRooms);
            }
        } catch (e) {
            console.error("채팅 목록 로드 실패:", e);
            if (showLoading) {
                setRoomsError("네트워크 오류가 발생했습니다.");
            }
        } finally {
            if (showLoading) {
                setIsRoomsLoading(false);
            }
        }
    }, [pendingRoomId, pendingItemId]);

    // 초기 채팅방 목록 로드
    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    // 주기적으로 채팅방 목록 새로고침 (안 읽은 메시지 수 동기화)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchRooms(false); // 로딩 표시 없이 백그라운드 갱신
        }, 30000); // 30초마다 갱신

        return () => clearInterval(interval);
    }, [fetchRooms]);

    // "불러오는 중..."인 새 채팅방의 상세 정보(상품명, 가격, 상대방) 가져오기
    useEffect(() => {
        const placeholderRoom = rooms.find(
            (r) => r.roomId === pendingRoomId && r.opponentNickname === "불러오는 중..."
        );

        if (!placeholderRoom || !pendingItemId || !pendingTxType) return;

        let isMounted = true;
        const fetchMissingDetails = async () => {
            try {
                const endpoint =
                    pendingTxType === "AUCTION"
                        ? `/api/v1/auctions/${pendingItemId}`
                        : `/api/v1/posts/${pendingItemId}`;

                const { rsData } = await apiRequest<any>(endpoint);

                if (!isMounted || !rsData?.data) return;

                const data = rsData.data;
                const itemName = pendingTxType === "AUCTION" ? data.name : data.title;
                const itemPrice =
                    pendingTxType === "AUCTION"
                        ? data.currentHighestBid || data.startPrice
                        : data.price;
                const opponentNickname = data.sellerNickname || "판매자";
                const itemImageUrl =
                    data.imageUrls && data.imageUrls.length > 0 ? data.imageUrls[0] : null;

                setRooms((prev) =>
                    prev.map((room) =>
                        room.roomId === pendingRoomId
                            ? {
                                ...room,
                                itemName,
                                itemPrice,
                                opponentNickname,
                                itemImageUrl,
                            }
                            : room
                    )
                );
            } catch (e) {
                console.error("실시간 상세 정보 가져오기 실패:", e);
            }
        };

        fetchMissingDetails();
        return () => {
            isMounted = false;
        };
    }, [rooms, pendingRoomId, pendingItemId, pendingTxType]);

    // Fetch messages when room selected
    useEffect(() => {
        if (!selectedRoomId) {
            setMessages([]);
            return;
        }
        setMessageText("");
        setPendingImages([]);
        setSendError(null);
        let isMounted = true;
        const fetchMessages = async () => {
            setIsMessagesLoading(true);
            setMessagesError(null);
            setHasMoreMessages(true);
            try {
                const { rsData, errorMessage, response } = await apiRequest<ChatDto[]>(
                    `/api/v1/chat/room/${selectedRoomId}`
                );
                if (!response.ok || !rsData) {
                    setMessagesError(errorMessage || "메시지를 불러오지 못했습니다.");
                    return;
                }
                if (!isMounted) return;
                const nextMessages = rsData.data || [];
                setMessages(nextMessages);
                const oldest = nextMessages[0]?.id ?? null;
                lastChatIdRef.current = typeof oldest === "number" ? oldest : null;
                setHasMoreMessages(nextMessages.length > 0);

                // ✅ 채팅방 진입 시 해당 방의 unreadCount를 0으로 초기화
                // 백엔드의 markMessagesAsRead가 호출되어 읽음 처리됨
                setRooms((prev) =>
                    prev.map((room) =>
                        room.roomId === selectedRoomId
                            ? { ...room, unreadCount: 0 }
                            : room
                    )
                );
            } catch {
                if (isMounted) setMessagesError("네트워크 오류가 발생했습니다.");
            } finally {
                if (isMounted) setIsMessagesLoading(false);
            }
        };
        fetchMessages();
        return () => {
            isMounted = false;
        };
    }, [selectedRoomId]);

    // Auto scroll to bottom
    useEffect(() => {
        if (!selectedRoomId || !messagesEndRef.current) return;
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }, [messages, selectedRoomId]);

    // WebSocket 토큰 (HttpOnly 쿠키 우회용) 가져오기
    useEffect(() => {
        // ✅ me (유저 정보)는 있어야 하지만, apiKey가 필수는 아님 (HttpOnly 쿠키 사용)
        if (!me || wsToken) return;

        let isMounted = true;
        const fetchWsToken = async () => {
            try {
                console.log("[DEBUG] WebSocket Token Fetch Started (Session based)");
                setIsWsTokenLoading(true);
                const { rsData } = await apiRequest<any>("/api/v1/members/ws-token");
                if (isMounted && rsData?.data?.token) {
                    console.log("[DEBUG] WebSocket token fetched successfully");
                    setWsToken(rsData.data.token);
                }
            } catch (e) {
                console.error("[DEBUG] Failed to fetch WebSocket token:", e);
            } finally {
                if (isMounted) setIsWsTokenLoading(false);
            }
        };

        fetchWsToken();
        return () => { isMounted = false; };
    }, [me, wsToken]);

    // WebSocket connection
    useEffect(() => {
        if (typeof window === "undefined") return;

        // ✅ roomId and wsToken are enough for HttpOnly cookie flow
        if (!selectedRoomId || !wsToken || !me) {
            return;
        }

        console.log("[DEBUG] WebSocket Connection Attempt:", {
            userId: me.id,
            roomId: selectedRoomId,
            hasWsToken: !!wsToken
        });

        let isActive = true;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 3;

        const client = new Client({
            webSocketFactory: () => new SockJS(buildApiUrl("/ws")),
            connectHeaders: { token: `Bearer ${wsToken}` },
            reconnectDelay: 5000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
            debug: (str) => {
                if (str.includes("STOMP") || str.includes("ERROR") || str.includes("Close") || str.includes("SUBSCRIBE")) {
                    console.log("[STOMP]", str);
                }
            },
            onConnect: (frame) => {
                if (!isActive) return;
                reconnectAttempts = 0;
                console.log("[STOMP] CONNECTED. User:", me.username, "Room:", selectedRoomId);

                // 메시지 구독
                console.log(`[STOMP] Subscribing to: /sub/v1/chat/room/${selectedRoomId}`);
                client.subscribe(`/sub/v1/chat/room/${selectedRoomId}`, (message) => {
                    if (!message.body || !isActive) return;
                    try {
                        console.log("[STOMP] Message received in room:", selectedRoomId);
                        const parsed = JSON.parse(message.body);
                        const data = parsed.data ?? parsed;
                        if (!data || (data.roomId && data.roomId !== selectedRoomId)) return;

                        const normalized: ChatDto = {
                            ...data,
                            id: data.id ?? undefined,
                            roomId: data.roomId ?? selectedRoomId,
                        };

                        setMessages((prev) => {
                            if (normalized.id && prev.some((msg) => msg.id === normalized.id))
                                return prev;
                            const next = [...prev, normalized];

                            if (normalized.senderId !== myId) {
                                console.log("[DEBUG] Opponent message received, triggering read sync...");
                                apiRequest(`/api/v1/chat/room/${selectedRoomId}`);
                            }

                            return next;
                        });

                        setRooms((prev) => {
                            if (prev.length === 0) return prev;
                            const next = prev.map((room) =>
                                room.roomId === selectedRoomId
                                    ? {
                                        ...room,
                                        lastMessage: normalized.message || "사진",
                                        lastMessageAt: normalized.createDate,
                                        unreadCount: 0,
                                    }
                                    : room
                            );
                            return [...next].sort(
                                (a, b) =>
                                    toTimestamp(b.lastMessageAt) - toTimestamp(a.lastMessageAt)
                            );
                        });
                    } catch (e) {
                        console.error("메시지 파싱 오류:", e);
                    }
                });

                // 읽음 상태 구독
                client.subscribe(
                    `/sub/v1/chat/room/${selectedRoomId}/read`,
                    (message) => {
                        if (!message.body || !isActive) return;
                        try {
                            const parsed = JSON.parse(message.body);
                            const readerId = parsed.readerId ?? parsed.data?.readerId;
                            if (readerId && readerId !== myId) {
                                setMessages((prev) =>
                                    prev.map((msg) =>
                                        msg.senderId === myId ? { ...msg, read: true } : msg
                                    )
                                );
                            }
                        } catch (e) {
                            console.error("읽음 상태 파싱 오류:", e);
                        }
                    }
                );
            },
            onStompError: (frame) => {
                const errorMsg = frame.headers["message"] || "Unknown STOMP error";
                console.error("[STOMP ERROR]", errorMsg, frame.body);

                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    console.log(`[STOMP] Connection retry attempt ${reconnectAttempts}/${maxReconnectAttempts}...`);
                }
            },
            onWebSocketClose: () => {
                if (isActive) console.log("[STOMP] WebSocket connection closed.");
            },
        });

        client.activate();
        return () => {
            isActive = false;
            client.deactivate();
        };
    }, [selectedRoomId, wsToken, me, myId]);

    // Send message
    const handleSend = async (filesOverride?: File[]) => {
        const imagesToSend = filesOverride || pendingImages;
        if (
            !selectedRoomId ||
            (!messageText.trim() && !imagesToSend.length) ||
            isSending
        )
            return;

        setIsSending(true);
        setSendError(null);
        try {
            const formData = new FormData();
            formData.append("roomId", selectedRoomId);
            if (messageText.trim()) formData.append("message", messageText.trim());
            imagesToSend.forEach((file) => formData.append("images", file));

            const response = await fetch(buildApiUrl("/api/v1/chat/send"), {
                method: "POST",
                headers: getAuthHeaders(),
                credentials: "include",
                body: formData,
            });

            if (!response.ok) {
                const raw = await response.text();
                let serverMessage = "";
                try {
                    const parsed = JSON.parse(raw);
                    serverMessage = parsed.msg || parsed.message || "";
                } catch {
                    serverMessage = raw.trim();
                }
                setSendError(serverMessage || "메시지 전송에 실패했습니다.");
                return;
            }

            const json = await safeJson<{
                resultCode?: string;
                data?: { chatId?: number };
            }>(response);
            const chatId = json?.data?.chatId ?? null;
            const nowIso = new Date().toISOString();

            // Optimistic update
            const optimisticMessage: ChatDto = {
                id: chatId ?? Date.now() * -1,
                roomId: selectedRoomId,
                itemId: selectedRoom?.itemId ?? 0,
                senderId: myId,
                message: messageText.trim(),
                imageUrls: imagesToSend.length
                    ? imagesToSend.map((f) => URL.createObjectURL(f))
                    : undefined,
                createDate: nowIso,
                read: false,
            };

            setMessages((prev) => {
                if (chatId && prev.some((msg) => msg.id === chatId)) return prev;
                return [...prev, optimisticMessage];
            });

            setRooms((prev) => {
                const next = prev.map((room) =>
                    room.roomId === selectedRoomId
                        ? {
                            ...room,
                            lastMessage: optimisticMessage.message || "사진",
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

    // Load older messages
    const handleLoadOlder = async () => {
        if (!selectedRoomId || isOlderLoading || !hasMoreMessages) return;
        const lastChatId = lastChatIdRef.current;
        setIsOlderLoading(true);
        try {
            const params = new URLSearchParams();
            if (lastChatId) params.set("lastChatId", String(lastChatId));
            const { rsData, errorMessage, response } = await apiRequest<ChatDto[]>(
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
            lastChatIdRef.current = older[0]?.id ?? null;
        } catch {
            setMessagesError("네트워크 오류가 발생했습니다.");
        } finally {
            setIsOlderLoading(false);
        }
    };

    // Handle image select
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // 최대 10장 제한
        const selectedFiles = files.slice(0, 10);

        // ✅ 이미지를 즉시 전송
        handleSend(selectedFiles);

        e.target.value = "";
    };

    // Remove pending image
    const removePendingImage = (index: number) => {
        setPendingImages((prev) => prev.filter((_, i) => i !== index));
    };

    // Handle Enter key
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ============================================
    // Render
    // ============================================

    return (
        <div className="chat-layout">
            {/* 좌측: 채팅방 리스트 (번개장터 스타일) */}
            <div className="chat-sidebar">
                <div className="chat-sidebar-header">
                    <div
                        className="chat-sidebar-title-row"
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                    >
                        <div className="chat-sidebar-title">{filterLabel}</div>
                    </div>

                    {isFilterOpen && (
                        <div className="chat-sidebar-dropdown" ref={filterDropdownRef}>
                            <button
                                className={`chat-sidebar-dropdown-item ${filterType === "ALL" ? "active" : ""}`}
                                onClick={() => { setFilterType("ALL"); setIsFilterOpen(false); }}
                            >
                                전체 대화
                            </button>
                            <button
                                className={`chat-sidebar-dropdown-item ${filterType === "POST" ? "active" : ""}`}
                                onClick={() => { setFilterType("POST"); setIsFilterOpen(false); }}
                            >
                                중고 거래
                            </button>
                            <button
                                className={`chat-sidebar-dropdown-item ${filterType === "AUCTION" ? "active" : ""}`}
                                onClick={() => { setFilterType("AUCTION"); setIsFilterOpen(false); }}
                            >
                                경매 거래
                            </button>
                        </div>
                    )}
                </div>

                <div className="chat-room-list">
                    {isRoomsLoading ? (
                        <div className="chat-loading">불러오는 중...</div>
                    ) : roomsError ? (
                        <div className="chat-loading" style={{ color: "var(--danger)" }}>
                            {roomsError}
                        </div>
                    ) : filteredRooms.length === 0 ? (
                        <div className="chat-loading">채팅방이 없습니다.</div>
                    ) : (
                        filteredRooms.map((room) => (
                            <button
                                key={room.roomId}
                                className={`chat-room-item ${selectedRoomId === room.roomId ? "active" : ""
                                }`}
                                onClick={() => setSelectedRoomId(room.roomId)}
                            >
                                <img
                                    src={resolveImageUrl(room.opponentProfileImageUrl)}
                                    alt=""
                                    className="chat-room-avatar"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = DEFAULT_PROFILE_URL;
                                    }}
                                />
                                <div className="chat-room-content">
                                    <div className="chat-room-header">
                                        <span className="chat-room-name">{room.opponentNickname || "알 수 없음"}</span>
                                    </div>
                                    <div className="chat-room-preview-row">
                                        <span className="chat-room-preview-text">
                                            {room.lastMessage || "사진"}
                                        </span>
                                        <span className="chat-room-date">
                                            · {formatRelativeTime(room.lastMessageAt)}
                                        </span>
                                    </div>
                                </div>
                                <div className="chat-room-right">
                                    {room.itemImageUrl && (
                                        <img
                                            src={resolveImageUrl(room.itemImageUrl)}
                                            alt=""
                                            className="chat-room-thumbnail"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = "none";
                                            }}
                                        />
                                    )}
                                    {room.unreadCount ? (
                                        <span className="chat-room-unread-badge">{room.unreadCount}</span>
                                    ) : null}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* 우측: 채팅창 */}
            <div className="chat-window">
                {!selectedRoomId ? (
                    <div className="chat-window-empty">
                        <div className="chat-empty-icon">💬</div>
                        <div className="chat-empty-text">대화방을 선택해주세요</div>
                    </div>
                ) : (
                    <>
                        {/* 상단 헤더 */}
                        <div className="chat-header">
                            <div className="chat-header-info">
                                <div className="chat-header-name">
                                    {selectedRoom?.opponentNickname || "알 수 없음"}
                                </div>
                            </div>
                            <div
                                className="chat-header-more"
                                onClick={() => setIsOptionsMenuOpen(true)}
                            >
                                ...
                            </div>
                        </div>

                        {/* 채팅 옵션 메뉴 (바텀 시트 스타일) */}
                        {isOptionsMenuOpen && (
                            <div className="chat-options-overlay" onClick={() => setIsOptionsMenuOpen(false)}>
                                <div className="chat-options-sheet" onClick={(e) => e.stopPropagation()}>
                                    <div className="chat-options-list">
                                        <button
                                            className="chat-options-item danger"
                                            onClick={() => {
                                                setIsExitModalOpen(true);
                                                setIsOptionsMenuOpen(false);
                                            }}
                                        >
                                            대화방 나가기
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 대화방 나가기 커스텀 확인 모달 */}
                        {isExitModalOpen && (
                            <div className="chat-confirm-overlay" onClick={() => setIsExitModalOpen(false)}>
                                <div className="chat-confirm-card" onClick={(e) => e.stopPropagation()}>
                                    <div className="chat-confirm-content">
                                        <div className="chat-confirm-title">대화방 나가기</div>
                                        <div className="chat-confirm-body">
                                            대화방을 나가면 대화 내용이 모두 삭제됩니다.{"\n"}대화방을 나가시겠습니까?
                                        </div>
                                    </div>
                                    <div className="chat-confirm-buttons">
                                        <button
                                            className="chat-confirm-btn"
                                            onClick={() => setIsExitModalOpen(false)}
                                        >
                                            아니오
                                        </button>
                                        <button
                                            className="chat-confirm-btn primary"
                                            onClick={handleLeaveRoom}
                                        >
                                            예
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 상품 정보 바 (구매하기 버튼 포함) */}
                        {selectedRoom?.itemId && (
                            <div className="chat-product-bar">
                                <img
                                    src={resolveImageUrl(selectedRoom.itemImageUrl)}
                                    alt=""
                                    className="chat-product-image"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                />
                                <div className="chat-product-details">
                                    <div className="chat-product-title">
                                        {selectedRoom?.itemName || "상품명 정보 없음"}
                                    </div>
                                    <div className="chat-product-price">
                                        {formatPrice(selectedRoom?.itemPrice)}
                                    </div>
                                    <div className="chat-product-shipping">무료배송</div>
                                </div>
                                <Link
                                    href={`/${selectedRoom?.txType === "AUCTION" ? "auctions" : "posts"
                                    }/${selectedRoom?.itemId}`}
                                >
                                    <button className="chat-product-buy-btn">구매하기</button>
                                </Link>
                            </div>
                        )}

                        {/* 메시지 영역 */}
                        <div className="chat-messages" ref={messagesContainerRef}>
                            {hasMoreMessages && messages.length > 0 && (
                                <button
                                    className="chat-loading"
                                    onClick={handleLoadOlder}
                                    disabled={isOlderLoading}
                                    style={{ border: 'none', background: 'transparent', width: '100%', cursor: 'pointer' }}
                                >
                                    {isOlderLoading ? "불러오는 중..." : "이전 메시지 보기"}
                                </button>
                            )}

                            {/* 채팅 시작 안내 카드 (첫 페이징일 때만 표시 등 로직 추가 가능) */}
                            {messages.length >= 0 && selectedRoom && (
                                <div className="chat-start-card">
                                    <div className="chat-start-info">
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <img
                                                src={resolveImageUrl(selectedRoom.itemImageUrl)}
                                                className="chat-start-image"
                                                alt=""
                                            />
                                            <div className="chat-start-text">
                                                <strong>{selectedRoom.opponentNickname}</strong>님과 <strong>{selectedRoom.itemName}</strong>에 대한 이야기를 시작해보세요.
                                            </div>
                                        </div>
                                        <div className="chat-start-stats">
                                            <span>· 상품금액: {formatPrice(selectedRoom.itemPrice)}</span>
                                            <span>· 거래방법: 일반택배 무료배송, 직거래 가능</span>
                                        </div>
                                        <Link
                                            href={`/${selectedRoom?.txType === "AUCTION" ? "auctions" : "posts"}/${selectedRoom?.itemId}`}
                                            className="chat-start-btn"
                                            style={{ textAlign: 'center', textDecoration: 'none' }}
                                        >
                                            상품상세 보기
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {isMessagesLoading ? (
                                <div className="chat-loading">불러오는 중...</div>
                            ) : messages.length === 0 ? (
                                <div className="chat-loading">메시지가 없습니다.</div>
                            ) : (
                                messages.map((message, index) => {
                                    const isMine = message.senderId === myId;
                                    const showDateDivider =
                                        index === 0 || !isSameDay(messages[index - 1].createDate, message.createDate);
                                    const readStatus = getReadStatus(message, index, messages);

                                    return (
                                        <div
                                            key={`${message.id ?? index}-${message.createDate}`}
                                            className="chat-message-wrapper"
                                        >
                                            {showDateDivider && (
                                                <div className="chat-date-divider">
                                                    <span>{formatDate(message.createDate)}</span>
                                                </div>
                                            )}

                                            <div className={`chat-message ${isMine ? "chat-message-mine" : "chat-message-opponent"}`}>
                                                {/* 상대방일 때만 프로필 노출 (번개장터 스타일은 생략하기도 함, 여기선 유지) */}
                                                {!isMine && (
                                                    <img
                                                        src={resolveImageUrl(message.senderProfileImageUrl)}
                                                        alt=""
                                                        className="chat-message-profile"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = DEFAULT_PROFILE_URL;
                                                        }}
                                                    />
                                                )}

                                                <div className="chat-message-content">
                                                    {message.message && (
                                                        <div className="chat-message-bubble">
                                                            {message.message}
                                                        </div>
                                                    )}
                                                    {message.imageUrls && message.imageUrls.length > 0 && (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                                            {message.imageUrls.map((url, imgIndex) => (
                                                                <img
                                                                    key={`${url}-${imgIndex}`}
                                                                    src={resolveImageUrl(url)}
                                                                    alt=""
                                                                    style={{ maxWidth: '200px', borderRadius: '8px' }}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 시간 및 읽음 표시 - 말풍선 옆으로 이동 */}
                                                <div className="chat-message-meta-time">
                                                    {isMine && readStatus !== "none" && (
                                                        <div style={{ color: 'var(--accent)', fontWeight: '700', fontSize: '10px' }}>
                                                            {readStatus === "read" ? "읽음" : "전송됨"}
                                                        </div>
                                                    )}
                                                    {formatTime(message.createDate)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* 하단 입력바 (번개장터 스타일) */}
                        <div className="chat-input-wrapper">
                            <div className="chat-input-container">
                                <div className="chat-input-add-btn" onClick={() => fileInputRef.current?.click()}>+</div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageSelect}
                                    style={{ display: "none" }}
                                />
                                <textarea
                                    className="chat-input-textarea"
                                    placeholder="메시지를 입력하세요"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    rows={1}
                                />
                                <button
                                    className="chat-input-send-btn"
                                    onClick={() => handleSend()}
                                    disabled={isSending}
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                    </svg>
                                </button>
                            </div>
                            {sendError && (
                                <div style={{ color: "var(--danger)", fontSize: 11, marginTop: 4, paddingLeft: 12 }}>
                                    {sendError}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
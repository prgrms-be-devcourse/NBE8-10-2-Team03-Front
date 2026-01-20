"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/client";
import { useAuth } from "@/contexts/AuthProvider";

// Types
interface ChatRoom {
    id: number;
    type: string;
    opponentNickname: string;
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount?: number;
}

interface ChatMessage {
    id: number;
    roomId: number;
    senderId: number;
    senderNickname?: string;
    content: string;
    createdAt: string;
}

export default function ChatPage() {
    const router = useRouter();
    const { me } = useAuth();

    // URL Params for deeplinking to a room ?roomId=123
    // Or handle selection state internally.
    // P-010 says /chat or /chat/[roomId]. 
    // For MVP single page split view, let's use internal state, optionally initialized from query param.
    const searchParams = useSearchParams();
    const initialRoomId = searchParams.get("roomId");

    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(initialRoomId ? Number(initialRoomId) : null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    const [isRoomsLoading, setIsRoomsLoading] = useState(true);
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [messageText, setMessageText] = useState("");

    const [roomsError, setRoomsError] = useState<string | null>(null);
    const [messagesError, setMessagesError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch Rooms
    const fetchRooms = async () => {
        setIsRoomsLoading(true);
        setRoomsError(null);
        try {
            const { data } = await api.get<ChatRoom[]>("/api/chat/rooms");
            const list = Array.isArray(data) ? data : (data as any).content || [];
            setRooms(list);
        } catch (e: any) {
            setRoomsError("채팅방 목록을 불러오는데 실패했습니다.");
        } finally {
            setIsRoomsLoading(false);
        }
    };

    // Fetch Messages
    const fetchMessages = async (roomId: number) => {
        setIsMessagesLoading(true);
        setMessagesError(null);
        try {
            // Fetch latest messages (e.g. size=50)
            const { data } = await api.get<ChatMessage[]>(`/api/chat/rooms/${roomId}/messages?size=50`);
            const list = Array.isArray(data) ? data : (data as any).content || [];
            // Sort by createdAt asc
            const sorted = list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            setMessages(sorted);
        } catch (e: any) {
            setMessagesError("메시지를 불러오는데 실패했습니다.");
        } finally {
            setIsMessagesLoading(false);
        }
    };

    // Initial Room Load
    useEffect(() => {
        fetchRooms();
    }, []);

    // Effect on Room Selection
    useEffect(() => {
        if (selectedRoomId) {
            fetchMessages(selectedRoomId);
            // Update URL without reload (optional UX)
            // router.replace(`/chat?roomId=${selectedRoomId}`);
        } else {
            setMessages([]);
        }
    }, [selectedRoomId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRoomId || !messageText.trim()) return;

        setIsSending(true);
        try {
            await api.post(`/api/chat/rooms/${selectedRoomId}/messages`, { content: messageText });
            setMessageText("");
            // Refresh messages
            await fetchMessages(selectedRoomId);
            // Optionally refresh rooms to update last message preview
            fetchRooms(); // fire-and-forget
        } catch (e: any) {
            alert("메시지 전송 실패: " + e.message);
        } finally {
            setIsSending(false);
        }
    };

    const handleRefresh = () => {
        if (selectedRoomId) {
            fetchMessages(selectedRoomId);
        }
        fetchRooms();
    };

    return (
        <div className="container mx-auto h-[calc(100vh-80px)] py-6 px-4">
            <div className="flex h-full bg-white rounded-lg shadow-sm border overflow-hidden">

                {/* Left: Room List */}
                <div className={`w-full md:w-1/3 border-r flex flex-col ${selectedRoomId ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h2 className="font-bold text-gray-700">채팅 목록</h2>
                        <button onClick={fetchRooms} className="text-gray-500 hover:text-blue-600 text-sm">
                            새로고침
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {isRoomsLoading ? (
                            <div className="p-4 text-center text-gray-400">로딩 중...</div>
                        ) : roomsError ? (
                            <div className="p-4 text-center text-red-500">{roomsError}</div>
                        ) : rooms.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">참여 중인 채팅방이 없습니다.</div>
                        ) : (
                            rooms.map(room => (
                                <div
                                    key={room.id}
                                    onClick={() => setSelectedRoomId(room.id)}
                                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${selectedRoomId === room.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
                                >
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold text-sm text-gray-900">{room.opponentNickname}</span>
                                        <span className="text-xs text-gray-500">
                                            {room.lastMessageAt ? new Date(room.lastMessageAt).toLocaleDateString() : ''}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 truncate">{room.lastMessage || "(대화 내용 없음)"}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Messages */}
                <div className={`w-full md:w-2/3 flex flex-col ${!selectedRoomId ? 'hidden md:flex' : 'flex'}`}>
                    {!selectedRoomId ? (
                        <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
                            채팅방을 선택해주세요.
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="p-4 border-b flex items-center justify-between bg-white shadow-sm z-10">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setSelectedRoomId(null)} className="md:hidden text-gray-500">
                                        &larr;
                                    </button>
                                    <span className="font-bold text-gray-800">
                                        {rooms.find(r => r.id === selectedRoomId)?.opponentNickname || "채팅방"}
                                    </span>
                                </div>
                                <button onClick={() => fetchMessages(selectedRoomId)} className="text-xs border px-2 py-1 rounded hover:bg-gray-50">
                                    새로고침
                                </button>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                                {isMessagesLoading && messages.length === 0 ? (
                                    <div className="text-center text-gray-400 py-10">메시지 로딩 중...</div>
                                ) : messagesError ? (
                                    <div className="text-center text-red-500 py-10">{messagesError}</div>
                                ) : messages.length === 0 ? (
                                    <div className="text-center text-gray-400 py-10">대화를 시작해보세요!</div>
                                ) : (
                                    messages.map(msg => {
                                        const isMe = msg.senderId === me?.id;
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[70%] px-4 py-2 rounded-lg text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 border rounded-bl-none'}`}>
                                                    {msg.content}
                                                    <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        placeholder="메시지를 입력하세요..."
                                        className="flex-1 border rounded-full px-4 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSending || !messageText.trim()}
                                        className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                                    >
                                        &uarr;
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

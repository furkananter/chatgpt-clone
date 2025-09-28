// app/chat/[chatId]/page.tsx
"use client";

import { useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { useChatStore, Chat } from "@/lib/stores/chat-store";

export default function ChatPage() {
  const params = useParams() as { chatId?: string };
  const chatId = params?.chatId;
  const {
    chats,
    messages,
    isLoading,
    error,
    loadChats,
    loadMessages,
    switchModel,
    selectedModel,
    sendMessage,
    editMessage,
    selectChat,
    activeChatId,
  } = useChatStore();

  const chat = useMemo(
    () => chats.find((c: Chat) => c.id === chatId),
    [chats, chatId]
  );

  const currentMessages = messages[chatId || ""] || [];
  const currentIsLoading = isLoading[chatId || ""] || false;
  const currentError = error[chatId || ""] || null;

  const endRef = useRef<HTMLDivElement | null>(null);

  // Load chats and messages when component mounts
  useEffect(() => {
    loadChats();
    if (chatId) {
      selectChat(chatId);
    }
  }, [chatId, loadChats, selectChat]);

  // Auto-send initial message if present in sessionStorage
  useEffect(() => {
    if (!chatId) return;

    const key = `cgpt:init:${chatId}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return;

    let pending: { text: string; files?: any[] } | null = null;
    try {
      pending = JSON.parse(raw);
    } catch {
      pending = { text: raw };
    }

    if (!pending?.text && !pending?.files?.length) {
      sessionStorage.removeItem(key);
      return;
    }

    const already = currentMessages.some(
      (m) => m.role === "user" && m.content === pending?.text
    );

    if (already) {
      sessionStorage.removeItem(key);
      return;
    }

    try {
      sendMessage(chatId, pending.text, pending.files);
    } catch (err) {
      console.error("Failed to auto-send initial message:", err);
    } finally {
      sessionStorage.removeItem(key);
    }
  }, [chatId, currentMessages, sendMessage]);

  // Scroll to bottom when messages update
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages.length]);

  const handleSend = (text: string, files?: any[]) => {
    if (!chatId) return;
    sendMessage(chatId, text, files);
  };

  const handleEdit = (messageId: string, text: string) => {
    if (!chatId) return;
    editMessage(chatId, messageId, text);
  };

  if (!chat) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-zinc-400">Chat not found</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <h1 className="text-lg font-semibold">{chat.title}</h1>
        <p className="text-sm text-gray-600">Model: {selectedModel}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          {currentError && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded border">
              Error: {currentError}
            </div>
          )}

          {currentMessages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg ${
                message.role === "user"
                  ? "bg-blue-100 ml-12"
                  : "bg-gray-100 mr-12"
              }`}
            >
              <div className="text-sm text-gray-600 mb-1">
                {message.role === "user" ? "You" : "Assistant"} -{" "}
                {new Date(message.created_at).toLocaleTimeString()}
              </div>
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.role === "assistant" && (
                <button
                  onClick={() =>
                    handleEdit(message.id, "Updated: " + message.content)
                  }
                  className="text-xs text-blue-600 hover:underline mt-2"
                >
                  Edit
                </button>
              )}
            </div>
          ))}

          {currentIsLoading && (
            <div className="text-center text-gray-500">Loading...</div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t p-4">
        <div className="mx-auto w-full max-w-2xl">
          <textarea
            className="w-full p-2 border rounded resize-none"
            rows={3}
            placeholder="Type your message..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const text = e.currentTarget.value.trim();
                if (text) {
                  handleSend(text);
                  e.currentTarget.value = "";
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

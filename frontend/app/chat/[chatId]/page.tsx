// app/chat/[chatId]/page.tsx
"use client";

import { useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { useChatStore, Chat } from "@/lib/stores/chat-store";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { MessageBubble } from "@/components/chat/message-bubble";

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
        <div className="text-muted-foreground">Chat not found</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <h1 className="text-lg font-semibold">{chat.title}</h1>
        <p className="text-sm text-muted-foreground">Model: {selectedModel}</p>
      </div>

      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-2xl space-y-4">
          {currentError && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded border">
              Error: {currentError}
            </div>
          )}

          {currentMessages.length === 0 ? (
            <ConversationEmptyState
              title="No messages yet"
              description="Start a conversation by typing a message below"
            />
          ) : (
            currentMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onEdit={(newText) => handleEdit(message.id, newText)}
              />
            ))
          )}

          {currentIsLoading && (
            <div className="text-center text-gray-500">Loading...</div>
          )}

          <div ref={endRef} />
        </ConversationContent>

        <ConversationScrollButton />
      </Conversation>

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

// app/chat/[chatId]/page.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useParams } from "next/navigation";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { MessageBubble } from "@/components/chat/message-bubble";
import { AI_Prompt } from "@/components/ui/animated-ai-input";
import { useChats } from "@/hooks/use-chats";
import {
  useChatMessages,
  useEditMessageMutation,
  useSendMessageMutation,
} from "@/hooks/use-chat-messages";
import { type AttachmentPayload } from "@/lib/api/chat";
import { useChatStore } from "@/lib/stores/chat-store";

export default function ChatPage() {
  const params = useParams() as { chatId?: string };
  const chatId = params?.chatId;

  const { chats } = useChats();
  const { messages, isLoading, isFetching, isError, error } = useChatMessages(chatId);
  const sendMessageMutation = useSendMessageMutation(chatId);
  const editMessageMutation = useEditMessageMutation(chatId);

  const { selectedModel, switchModel, setActiveChatId } = useChatStore();

  useEffect(() => {
    setActiveChatId(chatId ?? null);
    return () => setActiveChatId(null);
  }, [chatId, setActiveChatId]);

  const chat = useMemo(
    () => chats.find((item) => item.id === chatId),
    [chats, chatId]
  );

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!chatId) return;

    const key = `cgpt:init:${chatId}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return;

    let pending: { text?: string; files?: AttachmentPayload[] } | null = null;
    try {
      pending = JSON.parse(raw) as { text?: string; files?: AttachmentPayload[] };
    } catch {
      pending = { text: raw };
    }

    if (!pending?.text && !(pending?.files && pending.files.length > 0)) {
      sessionStorage.removeItem(key);
      return;
    }

    const hasSameMessage = messages.some(
      (message) => message.role === "user" && message.content === pending?.text
    );

    if (!hasSameMessage && pending?.text) {
      sendMessageMutation.mutate({
        content: pending.text,
        attachments: pending.files,
      });
    }

    sessionStorage.removeItem(key);
  }, [chatId, messages, sendMessageMutation]);

  const handleSend = (
    text: string,
    model: string,
    attachments?: AttachmentPayload[]
  ) => {
    if (!chatId || !text.trim()) {
      return;
    }
    switchModel(model);
    sendMessageMutation.mutate({ content: text, attachments });
  };

  const handleEdit = (messageId: string, text: string) => {
    if (!chatId || !text.trim()) {
      return;
    }
    editMessageMutation.mutate({ messageId, content: text });
  };

  if (!chat) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Chat not found</div>
      </div>
    );
  }

  const showLoader = isLoading || sendMessageMutation.isPending || isFetching;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <h1 className="text-lg font-semibold">{chat.title}</h1>
        <p className="text-sm text-muted-foreground">Model: {selectedModel}</p>
      </div>

      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-2xl space-y-4">
          {isError && error instanceof Error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded border">
              Error: {error.message}
            </div>
          )}

          {messages.length === 0 && !showLoader ? (
            <ConversationEmptyState
              title="No messages yet"
              description="Start a conversation by typing a message below"
            />
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onEdit={(newText) => handleEdit(message.id, newText)}
              />
            ))
          )}

          {showLoader && (
            <div className="text-center text-gray-500">Loading...</div>
          )}

          <div ref={endRef} />
        </ConversationContent>

        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-4 flex justify-center">
        <AI_Prompt
          placeholder="Message ChatGPT"
          onSubmit={handleSend}
          onModelChange={switchModel}
          defaultModel={selectedModel}
          disabled={sendMessageMutation.isPending}
        />
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { nanoid } from "nanoid";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { useChatHistory } from "@/hooks/use-chat-history";
import { useChatStore } from "@/lib/stores/chat-store";
import { queryKeys } from "@/lib/query/client";
import {
  normalizeMessage,
  type AttachmentPayload,
  type ChatMessage,
  type ChatSummary,
} from "@/lib/api/chat";
import { parseStreamEvent, type StreamEvent } from "@/lib/chat-stream";

type StreamingContext = {
  optimisticUserId: string;
  placeholderId: string;
};

interface SendMessageOptions {
  reuseExisting?: boolean;
  suppressInputReset?: boolean;
  attachments?: AttachmentPayload[];
}

const ERROR_COPY = "Sorry, there was an error. Please try again.";

export const useChatStream = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = params.chatId as string;
  const initialMessage = searchParams.get("message");

  const queryClient = useQueryClient();
  const setActiveChatId = useChatStore((state) => state.setActiveChatId);
  const selectedModel = useChatStore((state) => state.selectedModel);

  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const streamInFlightRef = useRef(false);
  const initialStreamTriggeredRef = useRef(false);
  const streamAbortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading } = useChatHistory(chatId, {
    enabled: !initialMessage,
  });

  const orderedMessages = useMemo(() => messages ?? [], [messages]);

  // Compute chat title
  const chatTitle = useMemo(() => {
    // Try to get chat title from cache
    const chats = queryClient.getQueryData<ChatSummary[]>(queryKeys.chats());
    const currentChat = chats?.find(chat => chat.id === chatId);
    
    if (currentChat?.title && currentChat.title !== "New Chat") {
      return currentChat.title;
    }

    // Use first user message as title (truncated)
    const firstUserMessage = orderedMessages.find(msg => msg.role === "user");
    if (firstUserMessage?.content) {
      const content = firstUserMessage.content.trim();
      return content.length > 50 
        ? `${content.substring(0, 50)}...` 
        : content;
    }

    // Fall back to "New Chat"
    return "New Chat";
  }, [orderedMessages, queryClient, chatId]);

  // Set active chat ID
  useEffect(() => {
    setActiveChatId(chatId);
  }, [chatId, setActiveChatId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [orderedMessages]);

  const updateChatSummary = useCallback(
    (shouldIncrement: boolean) => {
      queryClient.setQueryData(
        queryKeys.chats(),
        (current: ChatSummary[] = []) =>
          current.map((chat: ChatSummary) =>
            chat.id === chatId
              ? {
                  ...chat,
                  message_count: shouldIncrement
                    ? (chat.message_count ?? 0) + 1
                    : chat.message_count,
                  last_message_at: new Date().toISOString(),
                }
              : chat
          )
      );
    },
    [chatId, queryClient]
  );

  const ensureOptimisticMessages = useCallback(
    (
      content: string,
      attachments: AttachmentPayload[] | undefined,
      reuseExisting: boolean
    ): StreamingContext => {
      const timestamp = new Date().toISOString();
      const queryKey = queryKeys.chatMessages(chatId);

      let optimisticUserId = `temp-user-${nanoid()}`;
      let placeholderId = `temp-ai-${nanoid()}`;

      queryClient.setQueryData<ChatMessage[]>(queryKey, (current = []) => {
        const next = [...current];

        const findTemp = (role: "user" | "assistant") =>
          next
            .slice()
            .reverse()
            .find((message) =>
              role === "user"
                ? message.role === "user" && message.id.startsWith("temp-user")
                : message.role === "assistant" &&
                  message.id.startsWith("temp-ai")
            );

        if (reuseExisting) {
          const tempUser = findTemp("user");
          if (tempUser) {
            optimisticUserId = tempUser.id;
            const index = next.findIndex((item) => item.id === tempUser.id);
            next[index] = {
              ...tempUser,
              content,
              attachments,
            };
          } else {
            next.push({
              id: optimisticUserId,
              role: "user",
              content,
              created_at: timestamp,
              attachments,
            });
          }

          const tempAssistant = findTemp("assistant");
          if (tempAssistant) {
            placeholderId = tempAssistant.id;
            const index = next.findIndex(
              (item) => item.id === tempAssistant.id
            );
            next[index] = {
              ...tempAssistant,
              content: tempAssistant.content || "...",
              status: tempAssistant.status ?? "thinking",
            };
          } else {
            next.push({
              id: placeholderId,
              role: "assistant",
              content: "...",
              created_at: timestamp,
              status: "thinking",
            });
          }

          return next;
        }

        next.push({
          id: optimisticUserId,
          role: "user",
          content,
          created_at: timestamp,
          attachments,
        });

        next.push({
          id: placeholderId,
          role: "assistant",
          content: "...",
          created_at: timestamp,
          status: "thinking",
        });

        return next;
      });

      return { optimisticUserId, placeholderId };
    },
    [chatId, queryClient]
  );

  const ensureAssistantMessage = useCallback(
    (
      messageId: string,
      context: StreamingContext,
      updater: (existing: ChatMessage | undefined) => ChatMessage
    ) => {
      const queryKey = queryKeys.chatMessages(chatId);

      queryClient.setQueryData<ChatMessage[]>(queryKey, (current = []) => {
        const next = [...current];
        const placeholderIndex = next.findIndex(
          (message) => message.id === context.placeholderId
        );
        const targetIndex = next.findIndex(
          (message) => message.id === messageId
        );

        if (placeholderIndex !== -1 && targetIndex === -1 && messageId) {
          context.placeholderId = messageId;
        }

        const index = targetIndex !== -1 ? targetIndex : placeholderIndex;

        if (index === -1) {
          next.push(updater(undefined));
          return next;
        }

        const existing = next[index];
        const updated = updater(existing);
        next[index] = {
          ...updated,
          id: messageId || updated.id,
        };
        return next;
      });
    },
    [chatId, queryClient]
  );

  const handleStreamEvent = useCallback(
    (event: StreamEvent, context: StreamingContext) => {
      const queryKey = queryKeys.chatMessages(chatId);

      switch (event.type) {
        case "connected": {
          const serverUser = normalizeMessage(event.user_message);
          const assistant = event.assistant_message
            ? normalizeMessage(event.assistant_message)
            : null;

          queryClient.setQueryData<ChatMessage[]>(queryKey, (current = []) => {
            const next = [...current];

            const optimisticUserIndex = next.findIndex(
              (message) => message.id === context.optimisticUserId
            );
            if (optimisticUserIndex !== -1) {
              next[optimisticUserIndex] = serverUser;
              context.optimisticUserId = serverUser.id;
            } else if (!next.some((message) => message.id === serverUser.id)) {
              next.push(serverUser);
            }

            if (assistant) {
              const placeholderIndex = next.findIndex(
                (message) => message.id === context.placeholderId
              );

              const assistantIndex = next.findIndex(
                (message) => message.id === assistant.id
              );

              if (assistantIndex !== -1) {
                const existing = next[assistantIndex];
                next[assistantIndex] = {
                  ...assistant,
                  status: assistant.content
                    ? assistant.status
                    : existing?.status ?? "thinking",
                };
                context.placeholderId = assistant.id;
              } else if (placeholderIndex !== -1) {
                const existing = next[placeholderIndex];
                next[placeholderIndex] = {
                  ...assistant,
                  status: assistant.content
                    ? assistant.status
                    : existing?.status ?? "thinking",
                };
                context.placeholderId = assistant.id;
              } else {
                next.push({
                  ...assistant,
                  status: assistant.content ? assistant.status : "thinking",
                });
                context.placeholderId = assistant.id;
              }
            }

            return next;
          });
          break;
        }

        case "content_delta": {
          ensureAssistantMessage(event.message_id, context, (existing) => ({
            ...(existing ?? {
              id: event.message_id,
              role: "assistant",
              content: "",
              created_at: new Date().toISOString(),
            }),
            content: event.total_content || event.content,
            status: event.status ?? existing?.status ?? "processing",
          }));
          break;
        }

        case "completion": {
          ensureAssistantMessage(event.message_id, context, (existing) => ({
            ...(existing ?? {
              id: event.message_id,
              role: "assistant",
              content: "",
              created_at: new Date().toISOString(),
            }),
            content: event.content,
            status: event.status,
          }));

          if (event.queued_ai === false) {
            queryClient.invalidateQueries({ queryKey });
          }
          break;
        }

        case "error": {
          queryClient.setQueryData<ChatMessage[]>(queryKey, (current = []) =>
            current.map((message) =>
              message.id === context.placeholderId
                ? {
                    ...message,
                    content: ERROR_COPY,
                    status: "error",
                  }
                : message
            )
          );
          break;
        }

        case "timeout": {
          queryClient.invalidateQueries({ queryKey });
          break;
        }

        default:
          break;
      }
    },
    [chatId, ensureAssistantMessage, queryClient]
  );

  const sendMessage = useCallback(
    async (content: string, options: SendMessageOptions = {}) => {
      if (!chatId) return;

      const trimmed = content.trim();
      if (!trimmed || streamInFlightRef.current) return;

      streamInFlightRef.current = true;
      setIsStreaming(true);

      if (!options.suppressInputReset) {
        setInputValue("");
      }

      const reuseExisting = options.reuseExisting ?? false;
      const context = ensureOptimisticMessages(
        trimmed,
        options.attachments,
        reuseExisting
      );

      if (!reuseExisting) {
        updateChatSummary(true);
      }

      const queryKey = queryKeys.chatMessages(chatId);
      const controller = new AbortController();
      streamAbortRef.current = controller;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/chats/${chatId}/messages`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              Accept: "text/event-stream",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: trimmed,
              attachments: options.attachments,
              model: selectedModel,
            }),
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            const rawEvent = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);

            const dataLine = rawEvent
              .split("\n")
              .find((entry) => entry.startsWith("data:"));

            if (dataLine) {
              const payload = dataLine.replace(/^data:\s*/, "");
              try {
                const parsed = parseStreamEvent(JSON.parse(payload));
                if (parsed) {
                  handleStreamEvent(parsed, context);
                }
              } catch (error) {
                console.error("Stream parse error", error);
              }
            }

            boundary = buffer.indexOf("\n\n");
          }
        }

        queryClient.invalidateQueries({ queryKey });
      } catch (error) {
        console.error("Streaming error", error);
        queryClient.setQueryData<ChatMessage[]>(queryKey, (current = []) =>
          current.map((message) =>
            message.id === context.placeholderId
              ? {
                  ...message,
                  content: ERROR_COPY,
                  status: "error",
                }
              : message
          )
        );
      } finally {
        controller.abort();
        streamAbortRef.current = null;
        streamInFlightRef.current = false;
        setIsStreaming(false);
      }
    },
    [
      chatId,
      ensureOptimisticMessages,
      handleStreamEvent,
      queryClient,
      selectedModel,
      updateChatSummary,
    ]
  );

  // Handle initial message from URL params
  useEffect(() => {
    if (initialMessage && !initialStreamTriggeredRef.current) {
      initialStreamTriggeredRef.current = true;
      void sendMessage(initialMessage, {
        reuseExisting: true,
        suppressInputReset: true,
      });
      router.replace(`/chat/${chatId}`);
    }
  }, [chatId, initialMessage, router, sendMessage]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      streamAbortRef.current?.abort();
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    await sendMessage(inputValue);
  }, [inputValue, sendMessage]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const message = (formData.get("message") as string)?.trim();
      if (message) {
        await sendMessage(message);
        // Reset the form
        e.currentTarget.reset();
      }
    },
    [sendMessage]
  );

  return {
    // Data
    chatId,
    chatTitle,
    orderedMessages,
    isLoading,
    isStreaming,
    
    // Input state (deprecated - use form instead)
    inputValue,
    setInputValue,
    
    // Actions
    handleSubmit,
    handleKeyDown,
    handleFormSubmit,
    sendMessage,
    
    // Refs
    messagesEndRef,
  };
};

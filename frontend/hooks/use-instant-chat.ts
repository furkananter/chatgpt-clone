"use client";

import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useChatStore } from "@/lib/stores/chat-store";
import { normalizeMessage } from "@/lib/api/chat";
import { queryKeys } from "@/lib/query/client";
import {
  type AttachmentPayload,
  type ChatMessage,
  type ChatSummary,
} from "@/lib/api/chat";
import { parseStreamEvent, type StreamEvent } from "@/lib/chat-stream";

export const useInstantChat = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setActiveChatId } = useChatStore();

  const createInstantChat = (
    message: string,
    model: string,
    attachments?: AttachmentPayload[]
  ) => {
    // 1. Generate instant chat ID (proper UUID for Django)
    const chatId = uuidv4();

    // 2. Create optimistic messages
    const timestamp = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: `temp-user-${uuidv4()}`,
      role: "user",
      content: message,
      created_at: timestamp,
      attachments,
    };

    const assistantPlaceholder: ChatMessage = {
      id: `temp-ai-${uuidv4()}`,
      role: "assistant",
      content: "...",
      created_at: timestamp,
      status: "thinking",
    };

    // 3. Optimistically add to cache
    queryClient.setQueryData<ChatMessage[]>(queryKeys.chatMessages(chatId), [
      userMessage,
      assistantPlaceholder,
    ]);

    // 4. Add chat to chats list optimistically
    const newChat: ChatSummary = {
      id: chatId,
      title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
      message_count: 1,
      created_at: timestamp,
      last_message_at: timestamp,
      model_used: model,
      is_archived: false,
      is_pinned: false,
    };

    queryClient.setQueryData<ChatSummary[]>(
      queryKeys.chats(),
      (current = []) => [newChat, ...current]
    );

    // 5. INSTANT navigation (this is the key!)
    setActiveChatId(chatId);
    router.push(`/chat/${chatId}`);

    // 6. Start background streaming (don't await - let it run async)
    const optimisticUserId = userMessage.id;
    const placeholderId = assistantPlaceholder.id;

    void (async () => {
      try {
      const queryKey = queryKeys.chatMessages(chatId);

      const ensureAssistantMessage = (
        messageId: string,
        updater: (existing: ChatMessage | undefined) => ChatMessage
      ) => {
        queryClient.setQueryData<ChatMessage[]>(queryKey, (current = []) => {
          const next = [...current];

          const placeholderIndex = next.findIndex(
            (item) => item.id === placeholderId
          );

          const targetIndex = next.findIndex((item) => item.id === messageId);

          if (placeholderIndex !== -1 && placeholderIndex !== targetIndex) {
            next.splice(placeholderIndex, 1);
          }

          if (targetIndex === -1) {
            next.push(
              updater({
                id: messageId,
                role: "assistant",
                content: "",
                created_at: new Date().toISOString(),
              })
            );
            return next;
          }

          next[targetIndex] = updater(next[targetIndex]);
          return next;
        });
      };

      const handleStreamEvent = (event: StreamEvent) => {
        switch (event.type) {
          case "connected": {
            const serverUser = normalizeMessage(event.user_message);
            const assistant = event.assistant_message
              ? normalizeMessage(event.assistant_message)
              : null;

            queryClient.setQueryData<ChatMessage[]>(
              queryKey,
              (current = []) => {
                const next = [...current];

                const optimisticIdx = next.findIndex(
                  (item) => item.id === optimisticUserId
                );
                if (optimisticIdx !== -1) {
                  next[optimisticIdx] = serverUser;
                } else if (!next.some((item) => item.id === serverUser.id)) {
                  next.push(serverUser);
                }

                const placeholderIdx = next.findIndex(
                  (item) => item.id === placeholderId
                );

                if (assistant) {
                  if (placeholderIdx !== -1) {
                    // Preserve thinking status if assistant has no content yet
                    const existing = next[placeholderIdx];
                    next[placeholderIdx] = {
                      ...assistant,
                      status: assistant.content ? assistant.status : existing?.status ?? "thinking",
                    };
                  } else {
                    const existingIdx = next.findIndex(
                      (item) => item.id === assistant.id
                    );
                    if (existingIdx !== -1) {
                      const existing = next[existingIdx];
                      next[existingIdx] = {
                        ...assistant,
                        status: assistant.content ? assistant.status : existing?.status ?? "thinking",
                      };
                    } else {
                      next.push({
                        ...assistant,
                        status: assistant.content ? assistant.status : "thinking",
                      });
                    }
                  }
                } else if (placeholderIdx !== -1) {
                  next.splice(placeholderIdx, 1);
                }

                return next;
              }
            );
            break;
          }

          case "content_delta": {
            ensureAssistantMessage(event.message_id, (existing) => ({
              ...(existing ?? {
                id: event.message_id,
                role: "assistant",
                content: "",
                created_at: new Date().toISOString(),
              }),
              created_at: existing?.created_at ?? new Date().toISOString(),
              content: event.total_content || event.content,
              status: event.status ?? existing?.status,
            }));
            break;
          }

          case "completion": {
            ensureAssistantMessage(event.message_id, (existing) => ({
              ...(existing ?? {
                id: event.message_id,
                role: "assistant",
                content: "",
                created_at: new Date().toISOString(),
              }),
              created_at: existing?.created_at ?? new Date().toISOString(),
              content: event.content,
              status: event.status,
            }));

            if (event.queued_ai === false) {
              queryClient.invalidateQueries({ queryKey });
            }
            break;
          }

          case "error": {
            console.error("Stream error:", event.error);
            queryClient.invalidateQueries({ queryKey });
            break;
          }

          case "timeout": {
            queryClient.invalidateQueries({ queryKey });
            break;
          }

          default:
            break;
        }
      };

      // Send the message with streaming
      const streamResponse = async (): Promise<void> => {
        try {
          console.debug("instant-chat: starting SSE POST", { chatId, model });
          const streamUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/chats/${chatId}/messages`;

          const response = await fetch(streamUrl, {
            method: "POST",
            credentials: "include",
            headers: {
              Accept: "text/event-stream",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: message,
              attachments,
            }),
          });

          if (!response.ok) {
            // Handle authentication errors specifically
            if (response.status === 401 || response.status === 403) {
              console.error("Authentication error during chat creation");
              throw new Error("AUTHENTICATION_ERROR");
            }
            throw new Error(`HTTP ${response.status}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("No response body reader");
          }

          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

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
                    console.debug("instant-chat: stream event", parsed);
                    handleStreamEvent(parsed);
                  }
                } catch (error) {
                  console.error("Error parsing stream payload:", error);
                }
              }

              boundary = buffer.indexOf("\n\n");
            }
          }
        } catch (error) {
          console.error("Error setting up streaming:", error);

          // Check if it's an authentication error
          if (error instanceof Error && error.message === "AUTHENTICATION_ERROR") {
            // Remove optimistic data
            queryClient.removeQueries({ queryKey: queryKeys.chatMessages(chatId) });
            queryClient.setQueryData<ChatSummary[]>(
              queryKeys.chats(),
              (current = []) => current.filter((chat) => chat.id !== chatId)
            );

            // Clear assistant placeholder to stop "thinking..."
            queryClient.setQueryData<ChatMessage[]>(
              queryKeys.chatMessages(chatId),
              (current = []) => current.filter(m => m.id !== placeholderId)
            );

            throw error; // Re-throw to be caught by outer catch
          }

          // For other errors, just invalidate
          queryClient.invalidateQueries({
            queryKey: queryKeys.chatMessages(chatId),
          });
        } finally {
          console.debug("instant-chat: stream finished", { chatId });
          queryClient.invalidateQueries({ queryKey });
          // Now that streaming is done, update the chats list with server state
          queryClient.invalidateQueries({ queryKey: queryKeys.chats() });
        }
      };

        // Start streaming in background
        void streamResponse();

        // Note: Don't invalidate chats list immediately - let optimistic update persist
        // The sidebar will show the new chat immediately, and it gets confirmed by server response
      } catch (error) {
        // Error handling: remove optimistic data and redirect back
        console.error("Background streaming error:", error);

        // Clean up optimistic UI state
        queryClient.removeQueries({ queryKey: queryKeys.chatMessages(chatId) });
        queryClient.setQueryData<ChatSummary[]>(
          queryKeys.chats(),
          (current = []) => current.filter((chat) => chat.id !== chatId)
        );
        setActiveChatId(null);

        // If auth error, redirect to home, otherwise stay in chat
        if (error instanceof Error && error.message === "AUTHENTICATION_ERROR") {
          router.push("/");
        } else {
          router.push("/chat");
        }
      }
    })();

    // Return immediately - don't wait for streaming
    return chatId;
  };

  return { createInstantChat };
};

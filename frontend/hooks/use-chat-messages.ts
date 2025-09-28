"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { nanoid } from "nanoid";

import {
  editMessage,
  fetchChatMessages,
  regenerateMessage,
  sendMessage,
  type AttachmentPayload,
  type ChatMessage,
  type ChatSummary,
} from "@/lib/api/chat";
import { queryKeys } from "@/lib/query/client";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useChatMessages = (chatId?: string) => {
  const query = useQuery<ChatMessage[]>({
    queryKey: queryKeys.chatMessages(chatId),
    queryFn: ({ signal }) => {
      if (!chatId) {
        return Promise.resolve([]);
      }
      return fetchChatMessages(chatId, signal);
    },
    enabled: Boolean(chatId),
    placeholderData: keepPreviousData,
  });

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

interface SendMessageVariables {
  content: string;
  attachments?: AttachmentPayload[];
}

interface SendMessageContext {
  previousMessages: ChatMessage[];
  optimisticUserId: string;
  placeholderId: string;
  attachments?: AttachmentPayload[];
}

export const useSendMessageMutation = (chatId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, attachments }: SendMessageVariables) => {
      if (!chatId) {
        throw new Error("Cannot send a message without a chat id");
      }
      return sendMessage({ chatId, content, attachments });
    },
    onMutate: async (variables): Promise<SendMessageContext | undefined> => {
      if (!chatId) {
        return undefined;
      }

      const queryKey = queryKeys.chatMessages(chatId);
      await queryClient.cancelQueries({ queryKey });

      const previousMessages =
        queryClient.getQueryData<ChatMessage[]>(queryKey) ?? [];

      const timestamp = new Date().toISOString();
      const optimisticUser: ChatMessage = {
        id: `temp-user-${nanoid()}`,
        role: "user",
        content: variables.content,
        created_at: timestamp,
        attachments: variables.attachments,
      };

      const optimisticAssistant: ChatMessage = {
        id: `temp-ai-${nanoid()}`,
        role: "assistant",
        content: "...",
        created_at: timestamp,
      };

      queryClient.setQueryData<ChatMessage[]>(queryKey, [
        ...previousMessages,
        optimisticUser,
        optimisticAssistant,
      ]);

      return {
        previousMessages,
        optimisticUserId: optimisticUser.id,
        placeholderId: optimisticAssistant.id,
        attachments: variables.attachments,
      };
    },
    onSuccess: async (serverMessage, _variables, context) => {
      if (!chatId || !context) {
        return;
      }

      const queryKey = queryKeys.chatMessages(chatId);

      queryClient.setQueryData<ChatMessage[]>(queryKey, (current = []) =>
        current.map((message) =>
          message.id === context.optimisticUserId
            ? {
                ...serverMessage,
                attachments:
                  serverMessage.attachments ?? context.attachments ?? [],
              }
            : message
        )
      );

      queryClient.setQueryData<ChatSummary[]>(
        queryKeys.chats(),
        (chats = []) =>
          chats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  message_count: (chat.message_count ?? 0) + 1,
                  last_message_at: serverMessage.created_at,
                }
              : chat
          )
      );

      const pollForAssistant = async (attempt = 0): Promise<void> => {
        if (!chatId) {
          return;
        }

        // Backend responses can take a while; back off gradually
        const base = 4_000;
        const waitTime = Math.min(base + attempt * 2_000, 12_000);
        await delay(waitTime);

        try {
          const latest = await fetchChatMessages(chatId);

          const hasRealAssistant = latest.some(
            (message) =>
              message.role === "assistant" &&
              !message.id.startsWith("temp-ai-") &&
              message.content.trim() !== ""
          );

          queryClient.setQueryData<ChatMessage[]>(queryKey, (current = []) => {
            const optimisticUsers = current.filter((message) =>
              message.id.startsWith("temp-user-")
            );

            const merged = [...latest];

            optimisticUsers.forEach((optimistic) => {
              const alreadyIncluded = merged.some(
                (item) =>
                  item.id === optimistic.id ||
                  (item.role === "user" &&
                    item.content === optimistic.content &&
                    item.created_at === optimistic.created_at)
              );

              if (!alreadyIncluded) {
                merged.push(optimistic);
              }
            });

            if (!hasRealAssistant) {
              const placeholder = current.find(
                (message) => message.id === context.placeholderId
              );
              if (placeholder && !merged.some((m) => m.id === placeholder.id)) {
                merged.push(placeholder);
              }
            }

            return hasRealAssistant
              ? merged.filter((message) => message.id !== context.placeholderId)
              : merged;
          });

          if (!hasRealAssistant && attempt < 5) {
            return pollForAssistant(attempt + 1);
          }
        } catch (error) {
          if (attempt < 5) {
            return pollForAssistant(attempt + 1);
          }
        }
      };

      pollForAssistant();
    },
    onError: (_error, _variables, context) => {
      if (!chatId || !context) {
        return;
      }

      const queryKey = queryKeys.chatMessages(chatId);
      queryClient.setQueryData(queryKey, context.previousMessages);
    },
  });
};

interface EditMessageVariables {
  messageId: string;
  content: string;
}

export const useEditMessageMutation = (chatId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, content }: EditMessageVariables) => {
      if (!chatId) {
        throw new Error("Cannot edit a message without a chat id");
      }
      return editMessage({ chatId, messageId, content });
    },
    onMutate: async (variables) => {
      if (!chatId) {
        return undefined;
      }

      const queryKey = queryKeys.chatMessages(chatId);
      await queryClient.cancelQueries({ queryKey });
      const previousMessages =
        queryClient.getQueryData<ChatMessage[]>(queryKey) ?? [];

      queryClient.setQueryData<ChatMessage[]>(queryKey, (current = []) =>
        current.map((message) =>
          message.id === variables.messageId
            ? { ...message, content: variables.content }
            : message
        )
      );

      return { previousMessages };
    },
    onError: (_error, _variables, context) => {
      if (!chatId || !context) {
        return;
      }
      const queryKey = queryKeys.chatMessages(chatId);
      queryClient.setQueryData(queryKey, context.previousMessages);
    },
    onSettled: () => {
      if (!chatId) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.chatMessages(chatId) });
    },
  });
};

interface RegenerateMessageVariables {
  messageId: string;
}

export const useRegenerateMessageMutation = (chatId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId }: RegenerateMessageVariables) => {
      if (!chatId) {
        throw new Error("Cannot regenerate without a chat id");
      }
      return regenerateMessage({ chatId, messageId });
    },
    onSuccess: () => {
      if (!chatId) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.chatMessages(chatId) });
    },
  });
};

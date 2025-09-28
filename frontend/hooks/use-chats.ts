"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createChat,
  fetchChats,
  type ChatSummary,
  type CreateChatPayload,
} from "@/lib/api/chat";
import { queryKeys } from "@/lib/query/client";

export const useChats = () => {
  const query = useQuery<ChatSummary[]>({
    queryKey: queryKeys.chats(),
    queryFn: ({ signal }) => fetchChats(signal),
    staleTime: 1000 * 30, // Consider data fresh for 30 seconds
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
  });

  return {
    chats: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

export const useCreateChatMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateChatPayload) => createChat(payload),
    onSuccess: (chat) => {
      queryClient.setQueryData<ChatSummary[]>(queryKeys.chats(), (current) => {
        if (!current) {
          return [chat];
        }
        const exists = current.some((item) => item.id === chat.id);
        return exists ? current : [chat, ...current];
      });
    },
  });
};

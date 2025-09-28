import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useState, useEffect } from 'react';

// ... (type definitions)

async function fetchChats(): Promise<UIChat[]> {
  const data = await apiClient.get('/api/v1/chats/');
  return (data.items || data).map((chat: any) => ({
    id: chat.id,
    title: chat.title,
    model_used: chat.model_used,
    is_archived: chat.is_archived,
    is_pinned: chat.is_pinned,
    message_count: chat.message_count,
    last_message_at: chat.last_message_at,
    created_at: chat.created_at,
  }));
}

export function useChats(): UseChatsResponse {
  const [chats, setChats] = useState<UIChat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const mutate = async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const data = await fetchChats();
      setChats(data);
    } catch (error) {
      console.error("Error fetching chats:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    mutate();
  }, []);

  return {
    chats,
    isLoading,
    isError,
    mutate,
  };
}

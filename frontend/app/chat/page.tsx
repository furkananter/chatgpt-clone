// app/chat/page.tsx (ChatHomePage)
"use client";

import { ContentHeader } from "@/components/chat/content-header";
import { ChatInput } from "@/components/chat/chat-input";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useChatStore } from "@/lib/stores/chat-store";
import { useEffect } from "react";

export default function ChatHomePage() {
  const router = useRouter();
  const { user, isAuthenticated, token } = useAuthStore();
  const { selectedModel, loadChats } = useChatStore();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const startChat = async (text: string, files?: any[]) => {
    if (!isAuthenticated || !token) {
      console.log("Not authenticated");
      router.push("/login");
      return;
    }

    const BACKEND_URL =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/chats/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: text.slice(0, 50) + (text.length > 50 ? "..." : ""),
          initial_message: text,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create chat");
      }

      const chat = await response.json();
      await loadChats(); // Refresh the chat list
      router.push(`/chat/${chat.id}`);
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <ContentHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <h1 className="mb-6 text-center text-2xl font-semibold text-foreground sm:text-3xl">
          {"What's on the agenda today?"}
        </h1>
        <div className="mx-auto w-full max-w-2xl">
          <ChatInput placeholder="Ask anything" onSubmit={startChat} />
        </div>
      </main>
      <footer className="text-center text-xs text-muted-foreground px-4 pb-3 pt-2">
        ChatGPT can make mistakes. Check important info. See{" "}
        <a href="#" className="underline hover:text-foreground">
          Cookie Preferences
        </a>
        .
      </footer>
    </div>
  );
}

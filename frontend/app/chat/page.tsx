// app/chat/page.tsx (ChatHomePage)
"use client";

import { ContentHeader } from "@/components/chat/content-header";
import { AI_Prompt } from "@/components/ui/animated-ai-input";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useChatStore } from "@/lib/stores/chat-store";
import { useEffect } from "react";
import { useCreateChatMutation } from "@/hooks/use-chats";
import { type AttachmentPayload } from "@/lib/api/chat";

export default function ChatHomePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { selectedModel, switchModel } = useChatStore();
  const createChatMutation = useCreateChatMutation();

  // // Redirect to login if not authenticated
  // useEffect(() => {
  //   if (!isAuthenticated) {
  //     router.push("/");
  //   }
  // }, [isAuthenticated, router]);

  const startChat = async (
    text: string,
    selectedModel: string,
    attachments?: AttachmentPayload[]
  ) => {
    if (!isAuthenticated) {
      console.log("Not authenticated");
      router.push("/");
      return;
    }

    try {
      const chat = await createChatMutation.mutateAsync({
        title: text.slice(0, 50) + (text.length > 50 ? "..." : ""),
        initial_message: text,
        model: selectedModel,
      });

      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          `cgpt:init:${chat.id}`,
          JSON.stringify({ text })
        );
      }

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
          <AI_Prompt
            placeholder="Ask anything"
            onSubmit={startChat}
            onModelChange={switchModel}
            defaultModel={selectedModel}
            disabled={createChatMutation.isPending}
          />
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

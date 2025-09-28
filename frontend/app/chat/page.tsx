"use client";

import { useState } from "react";

import { useInstantChat } from "@/hooks/use-instant-chat";
import { useChatStore } from "@/lib/stores/chat-store";

export default function ChatHomePage() {
  const { createInstantChat } = useInstantChat();
  const selectedModel = useChatStore((state) => state.selectedModel);
  const [message, setMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createChat = () => {
    if (!message.trim() || isCreating) return;

    setIsCreating(true);
    try {
      createInstantChat(message.trim(), selectedModel);
      setMessage("");
    } catch (error) {
      console.error("Failed to create chat", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-6 bg-card rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6 text-center">Start New Chat</h1>

        <div className="space-y-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="w-full p-3 border border-input bg-background text-foreground rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            rows={4}
            disabled={isCreating}
          />

          <button
            onClick={createChat}
            disabled={!message.trim() || isCreating}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
          >
            {isCreating ? "Creating..." : "Start Chat"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { Brain, MessageSquare, Sparkles } from "lucide-react";

import { useInstantChat } from "@/hooks/use-instant-chat";
import { useChatStore } from "@/lib/stores/chat-store";
import { PromptBox } from "@/components/ui/chatgpt-prompt-input";
import { OpenAILogo } from "@/components/icons";

const suggestions = [
  {
    icon: Brain,
    title: "Explain a concept",
    description: "Break down complex topics in simple terms",
  },
  {
    icon: MessageSquare,
    title: "Have a conversation",
    description: "Chat about anything that interests you",
  },
  {
    icon: Sparkles,
    title: "Get creative help",
    description: "Generate ideas, stories, or solutions",
  },
];

export default function ChatHomePage() {
  const { createInstantChat } = useInstantChat();
  const selectedModel = useChatStore((state) => state.selectedModel);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isCreating) return;

    const formData = new FormData(e.currentTarget);
    const message = (formData.get("message") as string)?.trim();

    if (!message) return;

    setIsCreating(true);
    try {
      createInstantChat(message, selectedModel);
    } catch (error) {
      console.error("Failed to create chat", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      createInstantChat(suggestion, selectedModel);
    } catch (error) {
      console.error("Failed to create chat", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 flex items-center justify-center mb-4">
              <OpenAILogo className="w-16 h-16" />
            </div>
            <h1 className="text-3xl font-semibold text-foreground">
              How can I help you today?
            </h1>
            <p className="text-muted-foreground">
              Choose a suggestion below or ask me anything
            </p>
          </div>

          {/* Suggestions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion.description)}
                disabled={isCreating}
                className="group p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <suggestion.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-medium text-sm text-foreground group-hover:text-accent-foreground">
                      {suggestion.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {suggestion.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit}>
              <PromptBox
                name="message"
                disabled={isCreating}
                placeholder={isCreating ? "Creating chat..." : "Message..."}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

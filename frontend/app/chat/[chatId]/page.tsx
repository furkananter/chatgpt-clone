"use client";

import { Bot, User } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import { Response } from "@/components/ai-elements/response";
import { PromptBox } from "@/components/ui/chatgpt-prompt-input";
import { useChatStream } from "@/hooks/use-chat-stream";

export default function ChatPage() {
  const {
    chatTitle,
    orderedMessages,
    isLoading,
    isStreaming,
    handleFormSubmit,
  } = useChatStream();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-medium text-foreground line-clamp-1">
              {chatTitle}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isStreaming ? "AI is typing..." : "Chat assistant"}
            </p>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <Conversation className="flex-1 px-4">
        <ConversationContent className="max-w-4xl mx-auto space-y-4">
          {isLoading && orderedMessages.length === 0 ? (
            <ConversationEmptyState
              icon={<Bot className="w-12 h-12" />}
              title="Loading conversation..."
              description="Please wait while we fetch your messages"
            />
          ) : orderedMessages.length === 0 ? (
            <ConversationEmptyState
              icon={<Bot className="w-12 h-12" />}
              title="Start the conversation"
              description="Send a message to begin chatting with AI"
            />
          ) : (
            orderedMessages.map((msg) => (
              <Message key={msg.id} from={msg.role as "user" | "assistant"}>
                <MessageAvatar
                  src={msg.role === "user" ? "" : ""}
                  name={msg.role === "user" ? "You" : "AI"}
                />
                <MessageContent variant="flat">
                  {msg.role === "user" ? (
                    <div className="whitespace-pre-wrap text-sm">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="text-sm">
                      {msg.status === "thinking" && msg.content === "..." ? (
                        <div className="flex items-center space-x-2 py-2">
                          <Loader size={16} />
                          <span className="text-muted-foreground">Thinking...</span>
                        </div>
                      ) : msg.status === "processing" && !msg.content ? (
                        <div className="flex items-center space-x-2 py-2">
                          <Loader size={16} />
                          <span className="text-muted-foreground">Processing...</span>
                        </div>
                      ) : (
                        <Response>{msg.content}</Response>
                      )}
                    </div>
                  )}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input Area */}
      <footer className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t border-border p-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleFormSubmit}>
            <PromptBox
              name="message"
              disabled={isStreaming}
              placeholder={
                isStreaming 
                  ? "AI is responding..." 
                  : `Message ${chatTitle}...`
              }
            />
          </form>
        </div>
      </footer>
    </div>
  );
}

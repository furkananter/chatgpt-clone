"use client";

import { Bot } from "lucide-react";
import { useRef } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import { PromptBox } from "@/components/ui/chatgpt-prompt-input";
import { useChatStream } from "@/hooks/use-chat-stream";
import { MemoizedMarkdown } from "@/components/memoized-markdown";
import { TextShimmer } from "@/components/ui/text-shimmer";

export default function ChatPage() {
  const promptBoxRef = useRef<HTMLTextAreaElement & { reset: () => void }>(null);

  const {
    chatTitle,
    orderedMessages,
    isLoading,
    isStreaming,
    handleFormSubmit,
  } = useChatStream(promptBoxRef);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background px-4 py-3 shrink-0">
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
      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="max-w-3xl mx-auto space-y-4">
          {isLoading && orderedMessages.length === 0 ? (
            <ConversationEmptyState
              icon={<Loader size={30} />}
              title="Loading conversation..."
              description="Please wait while we fetch your messages"
            />
          ) : orderedMessages.length === 0 ? (
            <ConversationEmptyState
              icon={<Loader size={30} />}
              title="Start the conversation"
              description="Send a message to begin chatting with AI"
            />
          ) : (
            orderedMessages.map((msg) => (
              <Message key={msg.id} from={msg.role as "user" | "assistant"}>
                <MessageContent variant="flat">
                  {msg.role === "user" ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <div>
                      {msg.status === "thinking" || (msg.status === "processing" && (!msg.content || msg.content === "...")) ? (
                        <div className="flex items-center space-x-2 py-2">
                          <TextShimmer>{msg.status === "thinking" ? "Thinking..." : "Processing..."}</TextShimmer>
                        </div>
                      ) : (
                        <div>
                          <MemoizedMarkdown id={msg.id} content={msg.content} />
                          {msg.status === "processing" && (
                            <div className="flex items-center space-x-2 py-1 mt-2">
                              <TextShimmer className="text-xs">Still typing...</TextShimmer>
                            </div>
                          )}
                        </div>
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
      <footer className="sticky bottom-0 p-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleFormSubmit}>
            <PromptBox
              ref={promptBoxRef}
              name="message"
              disabled={isStreaming}
              placeholder={
                isStreaming ? "AI is responding..." : `Message ${chatTitle}...`
              }
            />
          </form>
        </div>
      </footer>
    </div>
  );
}

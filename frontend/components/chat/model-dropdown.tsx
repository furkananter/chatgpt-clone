"use client";

import { useChatStore } from "@/lib/stores/chat-store";
import { Sparkles, Atom } from "lucide-react";
import {
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectValue,
} from "@/components/ai-elements/prompt-input";

const MODELS = [
  {
    id: "gpt-5",
    name: "ChatGPT-5",
    description: "Our smartest model & more",
    upgrade: true,
    icon: <Sparkles className="w-4 h-4 text-white" />,
  },
  {
    id: "claude-sonnet-4",
    name: "Claude Sonnet 4",
    description: "Great for everyday tasks",
    upgrade: true,
    icon: <Atom className="w-4 h-4 text-zinc-400" />,
  },
  {
    id: "gpt-5-thinking",
    name: "ChatGPT-5 Thinking",
    description: "Great for everyday tasks",
    upgrade: true,
    icon: <Atom className="w-4 h-4 text-zinc-400" />,
  },
];

export function ModelDropdown() {
  const { selectedModel, switchModel } = useChatStore();

  // TODO(human): Implement custom model item rendering logic
  // Consider how to display model icons, descriptions, and upgrade badges
  // within the Select component structure. The current MODELS array has:
  // - icon: React component for model icon
  // - description: Model description text
  // - upgrade: Boolean for upgrade badge
  // You'll need to customize PromptInputModelSelectItem to show these elements

  return (
    <PromptInputModelSelect value={selectedModel} onValueChange={switchModel}>
      <PromptInputModelSelectTrigger className="w-auto min-w-[140px]">
        <PromptInputModelSelectValue placeholder="Select model" />
      </PromptInputModelSelectTrigger>

      <PromptInputModelSelectContent>
        {MODELS.map((model) => (
          <PromptInputModelSelectItem key={model.id} value={model.name}>
            {model.name}
          </PromptInputModelSelectItem>
        ))}
      </PromptInputModelSelectContent>
    </PromptInputModelSelect>
  );
}

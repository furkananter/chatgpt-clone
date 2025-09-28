"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MemoizedMarkdown } from "@/components/memoized-markdown";
import {
  Copy,
  Pencil,
  SquareArrowOutUpLeft,
  SquareArrowOutUpRight,
} from "lucide-react";

export function MessageBubble({
  message,
  onEdit,
}: {
  message: { id: string; role: string; content: string; created_at: string };
  onEdit?: (text: string) => void;
}) {
  const isUser = message.role === "user";
  const hasImage = false; // Not using file uploads currently

  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  const handleSendEdit = () => {
    if (!editedText.trim()) return;
    onEdit?.(editedText);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedText(message.content);
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "w-full group",
        isUser ? "flex justify-end" : "flex justify-start"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative max-w-2xl w-fit">
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-normal leading-6 flex flex-col gap-2",
            isUser
              ? "bg-secondary max-w-lg text-secondary-foreground"
              : "bg-primary text-zinc-200 w-full",
            "overflow-hidden text-pretty"
          )}
        >
          {editing ? (
            <div>
              <textarea
                ref={textareaRef}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={Math.min(editedText.split("\n").length + 1, 8)}
                className="w-full resize-none bg-transparent focus:outline-none text-secondary-foreground"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={handleCancelEdit}
                  className="text-secondary-foreground bg-black cursor-pointer px-3 py-1 text-sm rounded-full"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEdit}
                  className="bg-white text-secondary-foreground px-3 py-1 cursor-pointer text-sm rounded-full hover:opacity-90"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <MemoizedMarkdown id={message.id} content={message.content} />
          )}
        </div>

        {/* Floating Edit/Copy Buttons */}
        {isUser && !editing && !hasImage && hovered && (
          <div className="absolute bottom-[-32px] right-0 z-10 flex gap-2 bg-primary mt-2 px-3 py-1 rounded-full">
            <button
              onClick={() => setEditing(true)}
              className="text-white hover:bg-secondary rounded-md px-2 py-1"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopy}
              className="text-white hover:bg-secondary rounded-md px-2 py-1"
              title="Copy"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

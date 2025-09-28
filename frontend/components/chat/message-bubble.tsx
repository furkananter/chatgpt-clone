"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MemoizedMarkdown } from "@/components/memoized-markdown";
import { TextShimmer } from "@/components/ui/text-shimmer";
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
  message: { id: string; role: string; content: string; created_at: string; status?: string };
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
              : "text-foreground w-full", // Removed background for AI
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
          ) : (message.content === "..." || message.status === "thinking") && !isUser ? (
            <TextShimmer duration={1.5}>Thinking...</TextShimmer>
          ) : (
            <MemoizedMarkdown id={message.id} content={message.content} />
          )}
        </div>

        {/* Floating Edit/Copy Buttons */}
        <AnimatePresence>
          {isUser && !editing && !hasImage && hovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute bottom-[-32px] right-0 z-10 flex gap-2 bg-background border border-border px-3 py-1.5 rounded-full shadow-lg"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setEditing(true)}
                className="text-foreground hover:text-primary rounded-md px-2 py-1 transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopy}
                className="text-foreground hover:text-primary rounded-md px-2 py-1 transition-colors"
                title="Copy"
              >
                <Copy className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

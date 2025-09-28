"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Ellipsis } from "lucide-react";
import { type ChatSummary } from "@/lib/api/chat";

export function SidebarItem({ chat }: { chat: ChatSummary }) {
  const pathname = usePathname();
  const active = pathname?.endsWith(chat.id);

  return (
    <Link
      href={`/chat/${chat.id}`}
      className={cn(
        "group flex items-center hover:bg-muted justify-between rounded-xl px-3 py-2 text-sm cursor-pointer",
        active
          ? "bg-muted text-secondary-foreground"
          : "text-secondary-foreground hover:bg-muted"
      )}
    >
      <span className="truncate font-normal">{chat.title}</span>
      <Ellipsis className="h-4 w-4 text-secondary-foreground opacity-0 group-hover:opacity-100" />
    </Link>
  );
}

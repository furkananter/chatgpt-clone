import type React from "react";
// Shared layout for /chat and /chat/[chatId]

import { Sidebar } from "@/components/chat/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="h-[100dvh] overflow-y-hidden w-full bg-background text-foreground">
        <div className="mx-auto flex h-full max-w-screen-2xl">
          <Sidebar />
          <main className="flex-1 relative z-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

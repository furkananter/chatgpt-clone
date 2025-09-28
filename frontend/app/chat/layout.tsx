import type React from "react";
import { memo } from "react";
import dynamic from "next/dynamic";
// Shared layout for /chat and /chat/[chatId]

import { SidebarProvider } from "@/components/ui/sidebar";

// Lazy load Sidebar component to improve initial page load
const Sidebar = dynamic(
  () =>
    import("@/components/chat/sidebar/sidebar").then((mod) => ({
      default: mod.Sidebar,
    })),
  {
    loading: () => <div className="w-64 bg-gray-50 animate-pulse" />,
  }
);

const ChatLayout = memo(({ children }: { children: React.ReactNode }) => {
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
});

ChatLayout.displayName = "ChatLayout";

export default ChatLayout;

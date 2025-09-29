import type React from "react";
import { memo } from "react";

import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/chat/sidebar/sidebar";

const ChatLayout = memo(({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="h-[100dvh] overflow-y-hidden overflow-x-visible w-full bg-background text-foreground">
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

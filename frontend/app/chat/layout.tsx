"use client";

import type React from "react";
import { memo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";

import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/chat/sidebar/sidebar";

const ChatLayout = memo(({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // Check authentication on mount and whenever auth state changes
    if (!isLoading && !isAuthenticated) {
      console.log("Not authenticated, redirecting to home...");
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  // Show nothing while checking auth or if not authenticated
  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

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

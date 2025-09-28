"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PanelLeft, Plus, UsersRound, LogOut } from "lucide-react";
import { SidebarSection } from "./sidebar-section";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { SidebarHeader } from "./sidebar-header";
import { OpenAILogo } from "@/components/icons";
import { useChats } from "@/hooks/use-chats";
import { useAuthStore } from "@/lib/stores/auth-store";

export function Sidebar() {
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const { chats } = useChats();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)"); // lg breakpoint
    const apply = (matches: boolean) => {
      setIsDesktop(matches);
      setIsSidebarOpen(matches);
    };
    apply(mq.matches);

    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      const matches =
        "matches" in e ? e.matches : (e as MediaQueryList).matches;
      apply(matches);
    };

    if ("addEventListener" in mq) {
      mq.addEventListener("change", handler as (e: Event) => void);
      return () =>
        mq.removeEventListener("change", handler as (e: Event) => void);
    } else {
      // @ts-expect-error
      mq.addListener(handler);
      // @ts-expect-error
      return () => mq.removeListener(handler);
    }
  }, []);

  const toggleSidebar = () => setIsSidebarOpen((v) => !v);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div>
      {/* Backdrop shown only on mobile when sidebar is open */}
      {!isDesktop && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        aria-expanded={isSidebarOpen}
        className={cn(
          "flex h-full shrink-0 flex-col border-r border-border bg-background transition-[width,transform] duration-200 ease-linear",
          isDesktop
            ? isSidebarOpen
              ? "w-64"
              : "w-14"
            : isSidebarOpen
            ? "fixed inset-y-0 left-0 z-50 w-80"
            : "w-14"
        )}
      >
        {/* Top Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="py-3">
            <div
              className={cn(
                "flex items-center justify-between px-3",
                !isSidebarOpen && "justify-center"
              )}
            >
              <div className="flex justify-between w-full items-center">
                {isSidebarOpen && (
                  <button
                    className="p-2 hover:bg-muted rounded-md hover:cursor-pointer"
                    type="button"
                    onClick={() => router.push("/chat")}
                  >
                    <OpenAILogo />
                  </button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:text-foreground text-foreground hover:bg-muted hover:cursor-pointer"
                  onClick={toggleSidebar}
                  aria-label="Toggle sidebar"
                >
                  <PanelLeft className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {isSidebarOpen && <SidebarHeader />}
          </div>

          {/* Scrollable chat list */}
          {isSidebarOpen && (
            <div className="flex-1 space-y-6 px-3 overflow-y-auto">
              <SidebarSection title="Chats" chats={chats} />
            </div>
          )}
        </div>
        <br />

        {/* Footer always at bottom */}
        <div className={cn("px-2 pb-1 border-t", !isSidebarOpen && "px-0")}>
          {isSidebarOpen ? (
            <div className="flex items-center gap-3 p-3">
              {isAuthenticated && user ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm text-foreground truncate">
                        {user.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {user.plan}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={handleLogout}
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:text-foreground w-full cursor-pointer text-foreground hover:bg-muted"
                  onClick={() => router.push("/")}
                >
                  <UsersRound className="h-5 w-5 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2">
              {isAuthenticated && user ? (
                <>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={handleLogout}
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-foreground hover:bg-muted"
                  aria-label="Sign in"
                  onClick={() => router.push("/")}
                >
                  <UsersRound className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

"use client";

import type React from "react";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useUIStore } from "@/lib/stores/ui-store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useUIStore();
  const { setTheme: setNextTheme, theme: nextTheme } = useTheme();
  // Sync themes bidirectionally
  useEffect(() => {
    // Only update if there's actually a difference and both values exist
    if (theme && nextTheme && theme !== nextTheme) {
      // Prioritize next-themes as the source of truth
      setTheme(nextTheme as "light" | "dark" | "system");
    } else if (theme && !nextTheme) {
      // Initialize next-themes if it's not set
      setNextTheme(theme);
    }
  }, [theme, nextTheme, setTheme, setNextTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => setTheme("system");

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme, setTheme]);

  return <>{children}</>;
}

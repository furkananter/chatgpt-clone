"use client";

import type React from "react";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useUIStore } from "@/lib/stores/ui-store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useUIStore();
  const { setTheme: setNextTheme, theme: nextTheme } = useTheme();
  // Sync UI store theme with next-themes
  useEffect(() => {
    if (theme && theme !== nextTheme) {
      setNextTheme(theme);
    }
  }, [theme, setNextTheme, nextTheme]);

  // Update UI store when next-themes theme changes
  useEffect(() => {
    if (nextTheme && nextTheme !== theme) {
      setTheme(nextTheme as "light" | "dark" | "system");
    }
  }, [nextTheme, setTheme, theme]);

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

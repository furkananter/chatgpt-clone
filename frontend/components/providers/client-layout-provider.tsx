"use client";

import type React from "react";
import { Analytics } from "@vercel/analytics/next";
import { StoreProvider } from "@/components/providers/store-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense } from "react";

export function ClientLayoutProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Suspense fallback={null}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <StoreProvider>{children}</StoreProvider>
        </ThemeProvider>
      </Suspense>
      <Analytics />
    </>
  );
}

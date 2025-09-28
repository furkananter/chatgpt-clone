"use client";

import type React from "react";
import { Suspense } from "react";

import { StoreProvider } from "@/components/providers/store-provider";
import { ThemeProvider } from "@/components/theme-provider";

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
    </>
  );
}

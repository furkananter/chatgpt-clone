"use client";

import type { PropsWithChildren } from "react";
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { createQueryClient, setQueryClient } from "@/lib/query/client";

export function QueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(() => {
    const instance = createQueryClient();
    setQueryClient(instance);
    return instance;
  });

  return (
    <QueryClientProvider client={client}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

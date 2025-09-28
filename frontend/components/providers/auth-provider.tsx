"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import apiClient from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth-store";
import { createUserFromProfile } from "@/lib/stores/auth-store";
import { queryKeys } from "@/lib/query/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, popup, setPopup, setLoading, isAuthenticated } =
    useAuthStore();
  const router = useRouter();

  const currentUserQuery = useQuery({
    queryKey: queryKeys.currentUser(),
    enabled: !isAuthenticated,
    retry: false,
    queryFn: async () => {
      const userData = await apiClient.get("/api/v1/auth/me");
      return createUserFromProfile(userData);
    },
  });

  useEffect(() => {
    setLoading(currentUserQuery.isLoading || currentUserQuery.isFetching);
  }, [currentUserQuery.isLoading, currentUserQuery.isFetching, setLoading]);

  useEffect(() => {
    if (currentUserQuery.data && !isAuthenticated) {
      login(currentUserQuery.data);
    }
  }, [currentUserQuery.data, isAuthenticated, login]);

  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      const backendOrigin = (
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
      ).replace(/\/$/, "");
      if (event.origin !== backendOrigin) {
        // console.warn(`Message from untrusted origin ignored: ${event.origin}`);
        return;
      }

      const { data } = event;
      if (data && data.type === "AUTH_SUCCESS") {
        const { user } = data.payload;

        const frontendUser = createUserFromProfile(user);

        // For cookie-based auth, don't pass tokens - they're handled by cookies
        login(frontendUser);

        if (popup && !popup.closed) {
          popup.close();
        }
        setPopup(null);

        router.push("/chat");
      }
    };

    window.addEventListener("message", handleAuthMessage);

    return () => {
      window.removeEventListener("message", handleAuthMessage);
    };
  }, [login, router, popup, setPopup]);

  return <>{children}</>;
}

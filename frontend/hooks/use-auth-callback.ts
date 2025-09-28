import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore, createUserFromProfile } from "@/lib/stores/auth-store";
import apiClient from "@/lib/api";

interface AuthCallbackParams {
  code?: string | null;
  token?: string | null;
  refresh_token?: string | null;
  error?: string | null;
}

export function useAuthCallback(params: AuthCallbackParams) {
  const router = useRouter();
  const { login, setLoading, setError } = useAuthStore();

  // Mutation for OAuth code exchange
  const oauthMutation = useMutation({
    mutationFn: async ({ code }: { code: string }) => {
      const redirect_uri = `${window.location.origin}/auth/callback`;
      return await apiClient.postAuth("/api/v1/auth/google/oauth", {
        code,
        redirect_uri,
      });
    },
  });

  // Mutation for user data fetch
  const userMutation = useMutation({
    mutationFn: async () => {
      // Wait a moment for cookies to be available
      await new Promise((resolve) => setTimeout(resolve, 100));
      return await apiClient.get("/api/v1/auth/me");
    },
  });

  const handleCallback = useCallback(async () => {
    try {
      setLoading(true);

      if (params.error) {
        setError(`OAuth error: ${params.error}`);
        return;
      }

      // If we have tokens in URL (backend redirect), cookies should already be set
      if (params.token && params.refresh_token) {
        const userData = await userMutation.mutateAsync();
        if (userData) {
          const user = createUserFromProfile(userData);
          login(user);
          router.push("/chat");
        } else {
          setError("Failed to get user data");
        }
        return;
      }

      // Original code flow (direct from Google)
      if (!params.code) {
        setError("No authorization code or tokens received");
        return;
      }

      // Exchange code for tokens
      const data = await oauthMutation.mutateAsync({ code: params.code });
      if (data && data.user) {
        const user = createUserFromProfile(data.user);
        login(user);
        router.push("/chat");
      } else {
        setError("Authentication failed - no user data received");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Authentication failed";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [params.error, params.token, params.refresh_token, params.code]);

  return {
    handleCallback,
    isLoading: oauthMutation.isPending || userMutation.isPending,
    error: oauthMutation.error?.message || userMutation.error?.message || null,
  };
}

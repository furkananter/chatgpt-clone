"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore, createUserFromProfile } from "@/lib/stores/auth-store";
import apiClient from "@/lib/api";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, setLoading, error, setError } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      setLoading(true);

      const code = searchParams.get("code");
      const token = searchParams.get("token");
      const refresh_token = searchParams.get("refresh_token");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        setError(`OAuth error: ${errorParam}`);
        setLoading(false);
        return;
      }

      // If we have tokens directly from backend redirect
      if (token && refresh_token) {
        try {
          // Get user data with the token
          const userData = await apiClient.get("/api/v1/auth/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!userData) {
            throw new Error("Failed to get user data");
          }

          const user = createUserFromProfile(userData);

          // Update auth store with received data
          login(token, refresh_token, user);

          // Redirect to chat
          router.push("/chat");
          return;
        } catch (err: any) {
          setError(err.message || "Authentication failed");
          setLoading(false);
          return;
        }
      }

      // Original code flow (direct from Google)
      if (!code) {
        setError("No authorization code or tokens received");
        setLoading(false);
        return;
      }

      try {
        const redirect_uri = `${window.location.origin}/auth/callback`;

        const data = await apiClient.post("/api/v1/auth/google/oauth", {
          code,
          redirect_uri,
        });

        if (!data) {
          throw new Error("Authentication failed");
        }

        const user = createUserFromProfile(data.user);

        // Update auth store with received data
        login(data.access_token, data.refresh_token, user);

        // Redirect to chat
        router.push("/chat");
      } catch (err: any) {
        setError(err.message || "Authentication failed");
        console.error("Auth callback error:", err);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, login, setLoading, router, setError]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Authentication Error
          </h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-foreground">
          Completing sign in...
        </h1>
        <p className="text-muted-foreground">
          Please wait while we authenticate you.
        </p>
      </div>
    </div>
  );
}

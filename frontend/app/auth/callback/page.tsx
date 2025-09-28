"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useAuthCallback } from "@/hooks/use-auth-callback";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error: storeError } = useAuthStore();
  const hasRun = useRef(false);

  const code = searchParams.get("code");
  const token = searchParams.get("token");
  const refresh_token = searchParams.get("refresh_token");
  const errorParam = searchParams.get("error");

  const {
    handleCallback,
    isLoading,
    error: callbackError,
  } = useAuthCallback({
    code,
    token,
    refresh_token,
    error: errorParam,
  });

  const error = callbackError || storeError;

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      handleCallback();
    }
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Authentication Error
          </h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
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
          {isLoading ? "Completing sign in..." : "Authenticating..."}
        </h1>
        <p className="text-muted-foreground">
          Please wait while we authenticate you.
        </p>
      </div>
    </div>
  );
}

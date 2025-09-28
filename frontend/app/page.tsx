"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OpenAILogo } from "@/components/icons";
import { useGoogleAuth } from "@/hooks/use-google-auth";
import { fetchChats } from "@/lib/api/chat";
import { queryKeys } from "@/lib/query/client";

export default function HomePage() {
  const { handleGoogleAuth, error } = useGoogleAuth();
  const queryClient = useQueryClient();

  // Prefetch chats data for faster transitions after authentication
  useEffect(() => {
    const prefetchChats = () => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.chats(),
        queryFn: () => fetchChats(),
        staleTime: 1000 * 60 * 5, // Consider fresh for 5 minutes
      });
    };

    // Prefetch after a short delay to not block initial page load
    const timer = setTimeout(prefetchChats, 1000);
    return () => clearTimeout(timer);
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        {/* Logo */}
        <div className="flex justify-center pt-8 pb-2">
          <OpenAILogo className="mr-3 h-10 w-10" />
        </div>

        {/* Header */}
        <CardHeader className="text-center space-y-2 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="text-sm text-muted-foreground">
            Get started with your free account
          </p>
        </CardHeader>

        {/* Google OAuth Button */}
        <CardContent className="space-y-3">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <Button
            variant="outline"
            size="lg"
            className="w-full justify-center h-11 bg-transparent"
            onClick={handleGoogleAuth}
          >
            <svg className="mr-3 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

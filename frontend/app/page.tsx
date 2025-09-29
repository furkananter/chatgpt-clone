"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OpenAILogo } from "@/components/icons";
import { useGoogleAuth } from "@/hooks/use-google-auth";
import { fetchChats } from "@/lib/api/chat";
import { queryKeys } from "@/lib/query/client";
import { FaGoogle } from "react-icons/fa";

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
            <FaGoogle className="mr-2 h-5 w-5" />
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

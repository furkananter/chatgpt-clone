import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";

export function useGoogleAuth() {
  const router = useRouter();
  const { isAuthenticated, setLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/chat");
    }
  }, [isAuthenticated, router]);

  // Pre-fetch authorization URL using TanStack Query
  const { data: authData, isLoading: isAuthUrlLoading } = useQuery({
    queryKey: ["google-auth-url"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/google/authorize`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch authorization URL");
      }
      return response.json();
    },
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleGoogleAuth = () => {
    setLoading(true);
    setError(null);

    try {
      // Use pre-fetched authorization URL for direct redirect
      if (!authData?.authorization_url) {
        throw new Error("Authorization URL not ready. Please try again.");
      }

      // Direct redirect to Google OAuth
      window.location.href = authData.authorization_url;
    } catch (err: any) {
      setError(err.message || "Failed to initiate Google login");
      setLoading(false);
    }
  };

  return {
    handleGoogleAuth,
    error,
    isAuthReady: !!authData?.authorization_url && !isAuthUrlLoading,
    isLoading: isAuthUrlLoading,
  };
}

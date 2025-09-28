"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, popup, setPopup } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      const backendOrigin = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000").replace(/\/$/, '');
      if (event.origin !== backendOrigin) {
        // console.warn(`Message from untrusted origin ignored: ${event.origin}`);
        return;
      }

      const { data } = event;
      if (data && data.type === 'AUTH_SUCCESS') {
        const { access_token, refresh_token, user } = data.payload;

        const frontendUser = {
            ...user,
            name: user.display_name || `${user.first_name} ${user.last_name}`.trim(),
            avatar: user.avatar_url,
            plan: user.subscription_tier === 'free' ? 'Free' :
                  user.subscription_tier === 'plus' ? 'Plus' : 'Pro'
        };

        // The login function in the store might not accept all these arguments.
        // Adjusting the call to what was defined previously.
        login(access_token, frontendUser);

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

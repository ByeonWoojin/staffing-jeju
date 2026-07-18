"use client";

import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { Button } from "@/components/ui";
import type { UserRole } from "@/types/database";

interface GoogleLoginButtonProps {
  ctaLocation?: string;
  entryRole?: Exclude<UserRole, "admin">;
}

export function GoogleLoginButton({
  ctaLocation,
  entryRole,
}: GoogleLoginButtonProps = {}) {
  const loginStartedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (loginStartedRef.current) return;

    loginStartedRef.current = true;
    setIsLoading(true);
    trackEvent(ANALYTICS_EVENTS.AUTH_START, {
      method: "google",
      entry_role: entryRole,
      cta_location: ctaLocation,
    });

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      alert(`Google 로그인에 실패했습니다: ${error.message}`);
      loginStartedRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <Button fullWidth size="lg" onClick={handleLogin} disabled={isLoading}>
      <span
        aria-hidden="true"
        className="flex h-6 w-6 items-center justify-center rounded-sm bg-neutral-0"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          focusable="false"
        >
          <path
            fill="#4285F4"
            d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.52z"
          />
          <path
            fill="#34A853"
            d="M12 22c2.7 0 4.97-.9 6.62-2.43l-3.24-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.76-5.59-4.12H3.07v2.6A10 10 0 0 0 12 22z"
          />
          <path
            fill="#FBBC05"
            d="M6.41 13.89A6.01 6.01 0 0 1 6.1 12c0-.66.11-1.3.31-1.89v-2.6H3.07A10 10 0 0 0 2 12c0 1.61.39 3.13 1.07 4.49l3.34-2.6z"
          />
          <path
            fill="#EA4335"
            d="M12 5.99c1.47 0 2.78.5 3.82 1.5l2.87-2.87C16.96 3.01 14.7 2 12 2a10 10 0 0 0-8.93 5.51l3.34 2.6C7.2 7.75 9.4 5.99 12 5.99z"
          />
        </svg>
      </span>
      {isLoading ? "Google로 이동 중..." : "Google로 계속하기"}
    </Button>
  );
}

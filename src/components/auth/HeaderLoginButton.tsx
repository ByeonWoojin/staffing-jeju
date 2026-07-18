"use client";

import { useRef, useState, type ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { cn } from "@/lib/cn";
import type { UserRole } from "@/types/database";

interface HeaderLoginButtonProps {
  children?: ReactNode;
  className?: string;
  loadingText?: string;
  ctaLocation?: string;
  entryRole?: Exclude<UserRole, "admin">;
}

export function HeaderLoginButton({
  children,
  className,
  loadingText = "이동 중",
  ctaLocation,
  entryRole,
}: HeaderLoginButtonProps) {
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
      alert("로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
      loginStartedRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={isLoading}
      className={cn(
        "rounded-md border border-neutral-200 px-2.5 py-2 transition-colors hover:bg-neutral-50 focus-ring disabled:cursor-not-allowed disabled:text-neutral-400 sm:px-3",
        className,
      )}
    >
      {isLoading ? loadingText : (children ?? "로그인")}
    </button>
  );
}

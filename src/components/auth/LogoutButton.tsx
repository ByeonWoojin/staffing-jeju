"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  resetAnalyticsUser,
  trackEvent,
} from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { Button } from "@/components/ui";
import type { ButtonProps } from "@/components/ui";
import type { UserRole } from "@/types/database";

interface LogoutButtonProps {
  redirectTo?: string;
  fullWidth?: boolean;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  userRole?: UserRole;
}

export function LogoutButton({
  redirectTo = "/",
  fullWidth = false,
  variant = "outline",
  size = "sm",
  className,
  userRole,
}: LogoutButtonProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleLogout = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("로그아웃에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setIsSigningOut(false);
      return;
    }

    trackEvent(ANALYTICS_EVENTS.LOGOUT, {
      user_role: userRole,
    });
    resetAnalyticsUser();
    router.replace(redirectTo);
    router.refresh();
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      className={className}
      onClick={handleLogout}
      disabled={isSigningOut}
    >
      {isSigningOut ? "로그아웃 중..." : "로그아웃"}
    </Button>
  );
}

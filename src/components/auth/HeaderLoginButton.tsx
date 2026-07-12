"use client";

import { useState, type ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

interface HeaderLoginButtonProps {
  children?: ReactNode;
  className?: string;
  loadingText?: string;
}

export function HeaderLoginButton({
  children,
  className,
  loadingText = "이동 중",
}: HeaderLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (isLoading) return;

    setIsLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      alert("로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
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

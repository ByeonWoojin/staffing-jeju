"use client";

import { type ReactNode } from "react";
import { HeaderLoginButton } from "@/components/auth/HeaderLoginButton";
import { cn } from "@/lib/cn";
import type { UserRole } from "@/types/database";

interface GoogleLoginCtaButtonProps {
  children?: ReactNode;
  className?: string;
  loadingText?: string;
  ctaLocation?: string;
  entryRole?: Exclude<UserRole, "admin">;
  redirectPath?: string;
}

const googleCtaClassName =
  "inline-flex h-12 items-center justify-center gap-3 rounded-sm border border-[#747775] bg-neutral-0 px-4 text-[15px] font-medium text-[#1F1F1F] shadow-none transition-colors hover:bg-[#F7F8F8] active:bg-[#EEF0F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A73E8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:text-[#1F1F1F]!";

export function GoogleIcon() {
  return (
    <span
      aria-hidden="true"
      className="flex size-5 shrink-0 items-center justify-center"
    >
      <svg viewBox="0 0 24 24" className="size-5" focusable="false">
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
  );
}

export function GoogleLoginCtaButton({
  children = "Google로 시작하기",
  className,
  loadingText = "Google로 이동 중...",
  ctaLocation,
  entryRole,
  redirectPath,
}: GoogleLoginCtaButtonProps) {
  return (
    <HeaderLoginButton
      className={cn(googleCtaClassName, className)}
      loadingText={loadingText}
      ctaLocation={ctaLocation}
      entryRole={entryRole}
      redirectPath={redirectPath}
    >
      <GoogleIcon />
      <span>{children}</span>
    </HeaderLoginButton>
  );
}

"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

function hasMobileFixedApplyBar(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  return segments.length === 2 && segments[0] === "jobs";
}

export function FooterFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const needsMobileBottomSpacing = hasMobileFixedApplyBar(pathname);

  return (
    <div
      className={
        needsMobileBottomSpacing
          ? "pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-0"
          : undefined
      }
    >
      {children}
    </div>
  );
}

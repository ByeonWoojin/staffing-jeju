"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export const OWNER_NAV_ITEMS = [
  { href: "/owner", label: "홈", exact: true },
  { href: "/owner/guesthouse/edit", label: "게스트하우스 정보" },
  { href: "/owner/jobs", label: "스탭 모집 관리" },
  { href: "/owner/applications", label: "지원자 관리" },
] as const;

function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OwnerNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label="Owner navigation">
      {OWNER_NAV_ITEMS.map((item) => {
        const active = isNavActive(pathname, item.href, "exact" in item && item.exact);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-4 py-2.5 text-body-sm font-semibold transition-colors duration-150 focus-ring",
              active
                ? "bg-primary-50 text-primary-700"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800",
            )}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function OwnerMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-neutral-200 bg-neutral-0 px-4 py-2 md:hidden"
      aria-label="Owner mobile navigation"
    >
      {OWNER_NAV_ITEMS.map((item) => {
        const active = isNavActive(pathname, item.href, "exact" in item && item.exact);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-pill px-3 py-1.5 text-caption font-semibold transition-colors duration-150 focus-ring",
              active
                ? "bg-primary-50 text-primary-700"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
            )}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

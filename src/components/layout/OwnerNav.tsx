"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatNewApplicationCount } from "@/lib/application-status";
import { cn } from "@/lib/cn";
import { COACHMARK_TARGETS } from "@/lib/onboarding/coachmark-config";

export const OWNER_NAV_ITEMS = [
  { href: "/owner", label: "홈", exact: true },
  { href: "/owner/guesthouse/edit", label: "게스트하우스 정보" },
  { href: "/owner/jobs", label: "우리 게하 모집글 관리" },
  { href: "/owner/applications", label: "지원자 관리" },
] as const;

function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NewApplicationBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span
      className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-pill bg-primary-500 px-1.5 text-[11px] font-bold leading-none text-white"
      aria-label={`확인하지 않은 신규 지원자 ${count}명`}
    >
      {formatNewApplicationCount(count)}
    </span>
  );
}

export function OwnerNav({
  className,
  newApplicationCount = 0,
}: {
  className?: string;
  newApplicationCount?: number;
}) {
  const pathname = usePathname();

  return (
    <nav
      className={cn("flex flex-col gap-1", className)}
      aria-label="Owner navigation"
    >
      {OWNER_NAV_ITEMS.map((item) => {
        const active = isNavActive(
          pathname,
          item.href,
          "exact" in item && item.exact,
        );

        return (
          <Link
            key={item.href}
            href={item.href}
            data-coachmark={
              item.href === "/owner/applications"
                ? COACHMARK_TARGETS.ownerApplications
                : undefined
            }
            className={cn(
              "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-body-sm font-semibold transition-colors duration-150 focus-ring",
              active
                ? "bg-primary-50 text-primary-700"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800",
            )}
            aria-current={active ? "page" : undefined}
          >
            <span>{item.label}</span>
            {item.href === "/owner/applications" && (
              <NewApplicationBadge count={newApplicationCount} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function OwnerMobileNav({
  newApplicationCount = 0,
}: {
  newApplicationCount?: number;
}) {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-neutral-100 bg-neutral-0 px-4 py-2 md:hidden"
      aria-label="Owner mobile navigation"
    >
      {OWNER_NAV_ITEMS.map((item) => {
        const active = isNavActive(
          pathname,
          item.href,
          "exact" in item && item.exact,
        );

        return (
          <Link
            key={item.href}
            href={item.href}
            data-coachmark={
              item.href === "/owner/applications"
                ? COACHMARK_TARGETS.ownerApplications
                : undefined
            }
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-1.5 text-caption font-semibold transition-colors duration-150 focus-ring",
              active
                ? "bg-primary-50 text-primary-700"
                : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100",
            )}
            aria-current={active ? "page" : undefined}
          >
            <span>{item.label}</span>
            {item.href === "/owner/applications" && (
              <NewApplicationBadge count={newApplicationCount} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

import Link from "next/link";
import { HeaderLoginButton } from "@/components/auth/HeaderLoginButton";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { StaffApplicationsNavLink } from "@/components/layout/StaffApplicationsNavLink";
import { getStaffApplicationStatusSummary } from "@/lib/staff-application-data";
import type { ApplicationStatusSummary } from "@/lib/application-status";
import { cn } from "@/lib/cn";

export type AppHeaderActiveItem = "favorites" | "applications" | "profile";

interface AppHeaderProps {
  active?: AppHeaderActiveItem;
  isAuthenticated?: boolean;
  staffId?: string | null;
  applicationStatusSummaries?: ApplicationStatusSummary[];
  loginRedirectPath?: string;
}

const navLinkClassName =
  "rounded-md px-2.5 py-2 transition-colors hover:bg-neutral-100 focus-ring sm:px-3";
const activeNavLinkClassName = "bg-primary-50 text-primary-700";
const accountLinkClassName =
  "rounded-md border border-neutral-200 px-2.5 py-2 transition-colors hover:bg-neutral-50 focus-ring sm:px-3";

export async function AppHeader({
  active,
  isAuthenticated = false,
  staffId,
  applicationStatusSummaries,
  loginRedirectPath,
}: AppHeaderProps) {
  const logoHref = isAuthenticated ? "/jobs" : "/";
  const fetchedStatusSummary =
    isAuthenticated && (!staffId || !applicationStatusSummaries)
      ? await getStaffApplicationStatusSummary()
      : null;
  const resolvedStaffId = staffId ?? fetchedStatusSummary?.staffId ?? null;
  const resolvedApplicationStatusSummaries =
    applicationStatusSummaries ?? fetchedStatusSummary?.summaries ?? [];

  return (
    <header className="border-b border-neutral-100 bg-neutral-0">
      <div className="page-container flex h-14 items-center justify-between gap-4">
        <Link href={logoHref} className="flex min-w-0 items-center focus-ring">
          <BrandLogo className="h-7 sm:h-8" priority />
        </Link>

        <nav
          aria-label="스탭 메뉴"
          className="flex shrink-0 items-center gap-1 text-caption font-bold text-neutral-700 sm:gap-2 sm:text-body-sm"
        >
          <Link
            href="/staff/favorites"
            className={cn(
              navLinkClassName,
              active === "favorites" && activeNavLinkClassName,
            )}
            aria-current={active === "favorites" ? "page" : undefined}
          >
            관심 공고
          </Link>
          <StaffApplicationsNavLink
            active={active === "applications"}
            className={navLinkClassName}
            activeClassName={activeNavLinkClassName}
            staffId={resolvedStaffId}
            statusSummaries={resolvedApplicationStatusSummaries}
          />
          {isAuthenticated ? (
            <Link
              href="/mypage"
              className={cn(
                accountLinkClassName,
                active === "profile" && activeNavLinkClassName,
              )}
              aria-current={active === "profile" ? "page" : undefined}
            >
              프로필
            </Link>
          ) : (
            <HeaderLoginButton
              className={accountLinkClassName}
              ctaLocation="public_header"
              redirectPath={loginRedirectPath}
            />
          )}
        </nav>
      </div>
    </header>
  );
}

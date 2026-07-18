"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  formatApplicationStatusNotificationCount,
  type ApplicationStatusSummary,
} from "@/lib/application-status";
import {
  getChangedStaffApplicationStatuses,
  STAFF_APPLICATION_STATUS_SEEN_EVENT,
} from "@/lib/staff-application-status-storage";
import { cn } from "@/lib/cn";

interface StaffApplicationsNavLinkProps {
  active: boolean;
  className: string;
  activeClassName: string;
  staffId: string | null;
  statusSummaries: ApplicationStatusSummary[];
}

export function StaffApplicationsNavLink({
  active,
  className,
  activeClassName,
  staffId,
  statusSummaries,
}: StaffApplicationsNavLinkProps) {
  const summaryKey = useMemo(
    () =>
      statusSummaries
        .map(
          (summary) =>
            `${summary.applicationId}:${summary.status}:${summary.statusChangedAt ?? ""}`,
        )
        .join("|"),
    [statusSummaries],
  );
  const [changedCount, setChangedCount] = useState<number | null>(null);

  useEffect(() => {
    const updateChangedCount = () => {
      setChangedCount(
        getChangedStaffApplicationStatuses({
          staffId,
          summaries: statusSummaries,
        }).length,
      );
    };

    updateChangedCount();
    window.addEventListener("storage", updateChangedCount);
    window.addEventListener(
      STAFF_APPLICATION_STATUS_SEEN_EVENT,
      updateChangedCount,
    );

    return () => {
      window.removeEventListener("storage", updateChangedCount);
      window.removeEventListener(
        STAFF_APPLICATION_STATUS_SEEN_EVENT,
        updateChangedCount,
      );
    };
  }, [staffId, statusSummaries, summaryKey]);

  const hasChangedApplications =
    typeof changedCount === "number" && changedCount > 0;
  const href = hasChangedApplications
    ? "/staff/applications?focus=changed"
    : "/staff/applications";

  return (
    <Link
      href={href}
      className={cn(
        className,
        "relative inline-flex items-center gap-1.5",
        active && activeClassName,
      )}
      aria-current={active ? "page" : undefined}
      aria-label={
        hasChangedApplications
          ? `지원 현황: 지원 상태가 변경된 지원서 ${changedCount}건이 있습니다`
          : undefined
      }
    >
      <span>지원 현황</span>
      <span
        className={cn(
          "inline-flex h-4 min-w-4 items-center justify-center rounded-pill bg-primary-500 px-1 text-[10px] font-bold leading-none text-white",
          !hasChangedApplications && "invisible",
        )}
        aria-hidden="true"
      >
        {hasChangedApplications
          ? formatApplicationStatusNotificationCount(changedCount)
          : "0"}
      </span>
      {hasChangedApplications && (
        <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-primary-500 px-2.5 py-1.5 text-[11px] font-bold leading-none text-white shadow-sm sm:block">
          지원 상태가 변경되었어요
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-primary-500" />
        </span>
      )}
    </Link>
  );
}

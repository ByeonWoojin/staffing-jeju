import type { ApplicationStatus } from "@/types/database";

export const APPLICATION_STATUSES = [
  "submitted",
  "viewed",
  "accepted",
  "rejected",
  "canceled",
] as const satisfies readonly ApplicationStatus[];

export const NEW_APPLICATION_STATUS: ApplicationStatus = "submitted";
export const STAFF_APPLICATION_STATUS_NOTICE_STATUSES = [
  "viewed",
  "accepted",
  "rejected",
] as const satisfies readonly ApplicationStatus[];

export const STAFF_STATUS_NOTIFICATION_ROLLOUT_AT =
  "2026-07-18T09:00:00.000Z";

export type ApplicationStatusSummary = {
  applicationId: string;
  status: ApplicationStatus;
  statusChangedAt: string | null;
};

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return (
    typeof value === "string" &&
    APPLICATION_STATUSES.includes(value as ApplicationStatus)
  );
}

export function isNewApplicationStatus(
  status: ApplicationStatus | null | undefined,
) {
  return status === NEW_APPLICATION_STATUS;
}

export function isStaffApplicationStatusNoticeStatus(
  status: ApplicationStatus | null | undefined,
) {
  return (
    typeof status === "string" &&
    (
      STAFF_APPLICATION_STATUS_NOTICE_STATUSES as readonly ApplicationStatus[]
    ).includes(status)
  );
}

export function formatNewApplicationCount(count: number) {
  if (count > 99) return "99+";
  return String(count);
}

export function formatApplicationStatusNotificationCount(count: number) {
  if (count > 99) return "99+";
  return String(count);
}

import {
  STAFF_STATUS_NOTIFICATION_ROLLOUT_AT,
  isApplicationStatus,
  isStaffApplicationStatusNoticeStatus,
  type ApplicationStatusSummary,
} from "@/lib/application-status";
import type { ApplicationStatus } from "@/types/database";

export const STAFF_APPLICATION_STATUS_SEEN_STORAGE_KEY_PREFIX =
  "staffing:staff-application-status-seen:v1";
export const STAFF_APPLICATION_STATUS_SEEN_EVENT =
  "staffing:staff-application-status-seen-updated";

type SeenStatusMap = Record<string, ApplicationStatus>;

function canUseStorage() {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function getStaffApplicationStatusSeenStorageKey(staffId: string) {
  return `${STAFF_APPLICATION_STATUS_SEEN_STORAGE_KEY_PREFIX}:${staffId}`;
}

function isAfterNotificationRollout(statusChangedAt: string | null) {
  if (!statusChangedAt) return false;

  const changedAtTime = Date.parse(statusChangedAt);
  const rolloutTime = Date.parse(STAFF_STATUS_NOTIFICATION_ROLLOUT_AT);

  return Number.isFinite(changedAtTime) && changedAtTime >= rolloutTime;
}

export function readStaffApplicationStatusSeenMap(
  staffId: string,
): SeenStatusMap {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(
      getStaffApplicationStatusSeenStorageKey(staffId),
    );
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<SeenStatusMap>(
      (seenMap, [applicationId, status]) => {
        if (isApplicationStatus(status)) {
          seenMap[applicationId] = status;
        }
        return seenMap;
      },
      {},
    );
  } catch {
    return {};
  }
}

function writeStaffApplicationStatusSeenMap(
  staffId: string,
  seenMap: SeenStatusMap,
) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      getStaffApplicationStatusSeenStorageKey(staffId),
      JSON.stringify(seenMap),
    );
    window.dispatchEvent(new Event(STAFF_APPLICATION_STATUS_SEEN_EVENT));
  } catch {
    // Storage can be unavailable in restricted browser modes; app behavior should continue.
  }
}

function getPreparedStaffApplicationStatusSeenMap(
  staffId: string,
  summaries: ApplicationStatusSummary[],
) {
  const seenMap = readStaffApplicationStatusSeenMap(staffId);
  let changed = false;

  summaries.forEach((summary) => {
    if (
      !seenMap[summary.applicationId] &&
      isStaffApplicationStatusNoticeStatus(summary.status) &&
      !isAfterNotificationRollout(summary.statusChangedAt)
    ) {
      seenMap[summary.applicationId] = summary.status;
      changed = true;
    }
  });

  if (changed) {
    writeStaffApplicationStatusSeenMap(staffId, seenMap);
  }

  return seenMap;
}

export function getChangedStaffApplicationStatuses({
  staffId,
  summaries,
}: {
  staffId: string | null | undefined;
  summaries: ApplicationStatusSummary[];
}) {
  if (!staffId) return [];

  const seenMap = getPreparedStaffApplicationStatusSeenMap(staffId, summaries);

  return summaries.filter(
    (summary) => {
      if (!isStaffApplicationStatusNoticeStatus(summary.status)) return false;

      const lastSeenStatus = seenMap[summary.applicationId];
      if (lastSeenStatus) return lastSeenStatus !== summary.status;

      return isAfterNotificationRollout(summary.statusChangedAt);
    },
  ).sort((a, b) => {
    const aTime = a.statusChangedAt ? Date.parse(a.statusChangedAt) : 0;
    const bTime = b.statusChangedAt ? Date.parse(b.statusChangedAt) : 0;

    return bTime - aTime;
  });
}

export function markStaffApplicationStatusSeen({
  staffId,
  summary,
}: {
  staffId: string | null | undefined;
  summary: ApplicationStatusSummary;
}) {
  if (!staffId) return;
  if (!canUseStorage()) return;

  const nextSeenMap = {
    ...readStaffApplicationStatusSeenMap(staffId),
  };

  if (isStaffApplicationStatusNoticeStatus(summary.status)) {
    nextSeenMap[summary.applicationId] = summary.status;
    writeStaffApplicationStatusSeenMap(staffId, nextSeenMap);
  }
}

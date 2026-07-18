"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  Application,
  ApplicationStatus,
  Guesthouse,
  JobPost,
} from "@/types/database";
import {
  isStaffApplicationStatusNoticeStatus,
  type ApplicationStatusSummary,
} from "@/lib/application-status";
import {
  getChangedStaffApplicationStatuses,
  markStaffApplicationStatusSeen,
} from "@/lib/staff-application-status-storage";
import { formatDate } from "@/lib/owner-utils";
import { getApplicationStatusLabel } from "@/lib/labels";
import { CancelApplicationButton } from "@/components/jobs/CancelApplicationButton";
import { cn } from "@/lib/cn";
import { ApplicationStatusBadge, Card } from "@/components/ui";

type StaffApplicationListItem = {
  application: Application & { representativePhotoUrl?: string | null };
  jobPost: JobPost | null;
  guesthouse: Guesthouse | null;
  statusChangedAt: string | null;
};

interface StaffApplicationsStatusListProps {
  items: StaffApplicationListItem[];
  staffId: string;
  focusChanged?: boolean;
}

function ApplicationPhoto({
  src,
  alt,
}: {
  src: string | null | undefined;
  alt: string;
}) {
  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-beige">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center px-2 text-center text-caption font-semibold text-brown">
          사진 없음
        </div>
      )}
    </div>
  );
}

function isMostlyVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const verticalMargin = 88;

  return (
    rect.top >= verticalMargin &&
    rect.bottom <= window.innerHeight - verticalMargin
  );
}

function getPrefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function buildChangedStatusMap(summaries: ApplicationStatusSummary[]) {
  return summaries.reduce<
    Record<string, ApplicationStatus>
  >((changedMap, summary) => {
    changedMap[summary.applicationId] = summary.status;
    return changedMap;
  }, {});
}

export function StaffApplicationsStatusList({
  items,
  staffId,
  focusChanged = false,
}: StaffApplicationsStatusListProps) {
  const router = useRouter();
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const summaries = useMemo<ApplicationStatusSummary[]>(
    () =>
      items
        .filter(({ jobPost }) => Boolean(jobPost))
        .map(({ application, statusChangedAt }) => ({
          applicationId: application.id,
          status: application.status,
          statusChangedAt,
        })),
    [items],
  );
  const summaryKey = useMemo(
    () =>
      summaries
        .map(
          (summary) =>
            `${summary.applicationId}:${summary.status}:${summary.statusChangedAt ?? ""}`,
        )
        .join("|"),
    [summaries],
  );
  const [changedStatusById, setChangedStatusById] = useState<
    Record<string, ApplicationStatus>
  >({});

  useEffect(() => {
    const changedSummaries = getChangedStaffApplicationStatuses({
      staffId,
      summaries,
    });
    const changedSummaryById = new Map(
      changedSummaries.map((summary) => [summary.applicationId, summary]),
    );
    let cleanupObserver: (() => void) | undefined;
    let replaceTimeoutId: number | undefined;
    const animationFrameId = window.requestAnimationFrame(() => {
      setChangedStatusById(buildChangedStatusMap(changedSummaries));

      if (changedSummaries.length === 0) {
        if (focusChanged) {
          router.replace("/staff/applications", { scroll: false });
        }
        return;
      }

      const firstChangedCard =
        cardRefs.current[changedSummaries[0]?.applicationId];

      if (
        firstChangedCard &&
        (focusChanged || !isMostlyVisible(firstChangedCard))
      ) {
        firstChangedCard.scrollIntoView({
          behavior: getPrefersReducedMotion() ? "auto" : "smooth",
          block: "center",
        });
      }

      if (focusChanged) {
        replaceTimeoutId = window.setTimeout(
          () => router.replace("/staff/applications", { scroll: false }),
          getPrefersReducedMotion() ? 0 : 450,
        );
      }

      if (!("IntersectionObserver" in window)) {
        const firstChangedSummary = changedSummaries[0];
        if (firstChangedCard && firstChangedSummary) {
          markStaffApplicationStatusSeen({
            staffId,
            summary: firstChangedSummary,
          });
        }
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting || entry.intersectionRatio < 0.5) {
              return;
            }

            const applicationId = entry.target.getAttribute(
              "data-application-id",
            );
            if (!applicationId) return;

            const summary = changedSummaryById.get(applicationId);
            if (!summary) return;

            markStaffApplicationStatusSeen({ staffId, summary });
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.5 },
      );

      changedSummaries.forEach((summary) => {
        const card = cardRefs.current[summary.applicationId];
        if (card) observer.observe(card);
      });

      cleanupObserver = () => observer.disconnect();
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      if (replaceTimeoutId !== undefined) {
        window.clearTimeout(replaceTimeoutId);
      }
      cleanupObserver?.();
    };
  }, [focusChanged, router, staffId, summaries, summaryKey]);

  return (
    <div className="grid gap-4">
      {items.map(({ application, jobPost, guesthouse }) => {
        const canCancel =
          application.status === "submitted" || application.status === "viewed";
        const changedStatus = changedStatusById[application.id];
        const showChangedNotice =
          changedStatus &&
          changedStatus === application.status &&
          isStaffApplicationStatusNoticeStatus(application.status);

        return (
          <div
            key={application.id}
            ref={(node) => {
              cardRefs.current[application.id] = node;
            }}
            data-application-id={application.id}
            className="scroll-mt-24"
          >
            <Card
              className={cn(
                "flex flex-col gap-4 sm:flex-row sm:items-start",
                showChangedNotice &&
                  "border-primary-200 bg-primary-50/45 shadow-md shadow-primary-100/60 ring-1 ring-primary-100",
              )}
            >
              <ApplicationPhoto
                src={application.representativePhotoUrl}
                alt={`${application.name} 대표사진`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-caption font-semibold text-neutral-500">
                      {guesthouse
                        ? `${guesthouse.name} · ${guesthouse.region}`
                        : "게스트하우스 정보 없음"}
                    </p>
                    <h2 className="mt-1 line-clamp-2 text-title text-neutral-900">
                      {jobPost?.title ?? "모집글 정보 없음"}
                    </h2>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {showChangedNotice && (
                      <span className="rounded-md bg-primary-50 px-2.5 py-1.5 text-caption font-bold text-primary-700 ring-1 ring-primary-100">
                        {`사장님이 지원 상태를 '${getApplicationStatusLabel(
                          application.status,
                        )}'으로 변경했어요`}
                      </span>
                    )}
                    <ApplicationStatusBadge status={application.status} />
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 text-body-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-caption font-semibold text-neutral-400">
                      지원일
                    </dt>
                    <dd className="mt-1 text-neutral-700">
                      {formatDate(application.created_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption font-semibold text-neutral-400">
                      입도 가능일
                    </dt>
                    <dd className="mt-1 text-neutral-700">
                      {formatDate(application.available_start_date)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption font-semibold text-neutral-400">
                      근무 시작일
                    </dt>
                    <dd className="mt-1 text-neutral-700">
                      {jobPost ? formatDate(jobPost.work_start_date) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption font-semibold text-neutral-400">
                      가능 근무 기간
                    </dt>
                    <dd className="mt-1 text-neutral-700">
                      {application.available_work_period}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {jobPost?.slug && (
                    <Link
                      href={`/jobs/${jobPost.slug}`}
                      className="inline-flex h-9 items-center rounded-md border border-neutral-200 bg-neutral-0 px-4 text-body-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-ring"
                    >
                      모집글 보기
                    </Link>
                  )}
                  {canCancel && (
                    <CancelApplicationButton applicationId={application.id} />
                  )}
                </div>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

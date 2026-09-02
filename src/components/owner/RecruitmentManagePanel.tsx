"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Guesthouse, JobPost } from "@/types/database";
import { formatDate, formatDateTime } from "@/lib/owner-utils";
import { isUuid } from "@/lib/uuid";
import { getBumpDisabledReason } from "@/lib/owner-data";
import { getSafeErrorMessage } from "@/lib/action-result";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  bumpRecruitment,
  closeRecruitment,
  hideRecruitment,
  markUrgentRecruitment,
  reopenRecruitment,
} from "@/app/owner/jobs/actions";
import {
  AccommodationBadge,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardContent,
  CardFooter,
  JobStatusBadge,
  MealBadge,
  UrgentBadge,
} from "@/components/ui";
import { OwnerActionModal } from "./OwnerActionModal";

const URGENT_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
type ManageAction = "close" | "reopen" | "bump" | "urgent" | "delete";

interface RecruitmentManagePanelProps {
  initialJobPost: JobPost;
  guesthouse: Guesthouse | null;
  applicationCount: number;
}

function getUrgentDisabledReason(jobPost: JobPost): string | null {
  if (jobPost.status !== "open") {
    return "모집중 상태에서만 급구 처리할 수 있습니다.";
  }
  if (jobPost.is_urgent) {
    return "이미 급구 공고로 표시되어 있습니다.";
  }
  if (!jobPost.last_urgent_marked_at) return null;

  const lastUrgentMarkedAt = new Date(
    jobPost.last_urgent_marked_at,
  ).getTime();
  if (Date.now() < lastUrgentMarkedAt + URGENT_INTERVAL_MS) {
    return "급구 처리는 한 달에 한 번만 가능합니다.";
  }

  return null;
}

function getBumpRestrictionMessage(jobPost: JobPost): string | null {
  if (jobPost.status !== "open") {
    return "모집중 상태에서만 끌어올릴 수 있습니다.";
  }
  if (!jobPost.last_bumped_at) return null;

  const nextAvailableAt =
    new Date(jobPost.last_bumped_at).getTime() + 24 * 60 * 60 * 1000;
  const remainingMs = nextAvailableAt - Date.now();

  if (remainingMs <= 0) return null;

  const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  return `끌어올리기는 ${remainingHours}시간 후 다시 가능합니다.`;
}

export function RecruitmentManagePanel({
  initialJobPost,
  guesthouse,
  applicationCount,
}: RecruitmentManagePanelProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<ManageAction | null>(
    null,
  );
  const [modalAction, setModalAction] = useState<ManageAction | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const jobPost = initialJobPost;
  const bumpDisabledReason =
    getBumpRestrictionMessage(jobPost) ?? getBumpDisabledReason(jobPost);
  const urgentDisabledReason = getUrgentDisabledReason(jobPost);
  const isActionPending = pendingAction !== null;
  const isDatabaseJobPost = isUuid(jobPost.id);
  const actionDisabledReason = isDatabaseJobPost
    ? null
    : "개발용 mock 데이터에서는 액션을 실행할 수 없습니다.";

  const openModal = (action: ManageAction) => {
    setModalAction(action);
    setModalError(null);
  };

  const closeModal = () => {
    if (isActionPending) return;
    setModalAction(null);
    setModalError(null);
  };

  const handleConfirmAction = async () => {
    if (!modalAction) return;
    if (actionDisabledReason) {
      setModalError(actionDisabledReason);
      return;
    }
    if (modalAction === "bump" && bumpDisabledReason) {
      setModalError(bumpDisabledReason);
      return;
    }
    if (modalAction === "urgent" && urgentDisabledReason) {
      setModalError(urgentDisabledReason);
      return;
    }

    setPendingAction(modalAction);
    setModalError(null);

    try {
      let updatedJobPost: JobPost | null = null;
      if (modalAction === "close") {
        updatedJobPost = await closeRecruitment(jobPost.id);
      }
      if (modalAction === "reopen") {
        updatedJobPost = await reopenRecruitment(jobPost.id);
      }
      if (modalAction === "bump") {
        await bumpRecruitment(jobPost.id);
      }
      if (modalAction === "urgent") {
        await markUrgentRecruitment(jobPost.id);
      }
      if (modalAction === "delete") {
        updatedJobPost = await hideRecruitment(jobPost.id);
      }
      if (updatedJobPost && updatedJobPost.status !== jobPost.status) {
        trackEvent(ANALYTICS_EVENTS.JOB_POST_STATUS_CHANGE, {
          job_post_id: updatedJobPost.id,
          previous_status: jobPost.status,
          next_status: updatedJobPost.status,
          user_role: "owner",
        });
      }
      setModalAction(null);
      router.refresh();
    } catch (error) {
      setModalError(
        getSafeErrorMessage(
          error,
          "처리에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        ),
      );
    } finally {
      setPendingAction(null);
    }
  };

  const modalConfig =
    modalAction === "bump"
      ? {
          title: "모집글을 끌어올릴까요?",
          description:
            "끌어올리면 공고가 목록 상단에 다시 노출됩니다. 24시간에 한 번만 사용할 수 있습니다.",
          confirmLabel: "끌어올리기",
          tone: "primary" as const,
        }
      : modalAction === "close"
        ? {
            title: "모집을 마감할까요?",
            description:
              "마감된 공고는 목록에는 흐리게 표시되지만, 지원은 받을 수 없습니다.",
            confirmLabel: "모집 마감",
            tone: "danger" as const,
          }
        : modalAction === "reopen"
          ? {
              title: "다시 모집을 시작할까요?",
              description: "모집글이 다시 공개되고 지원을 받을 수 있습니다.",
              confirmLabel: "모집중으로 변경",
              tone: "primary" as const,
            }
          : modalAction === "urgent"
            ? {
                title: "급구 공고로 표시할까요?",
                description:
                  "급구 공고는 스탭 목록에서 더 눈에 띄게 표시됩니다.",
                confirmLabel: "급구 처리",
                tone: "primary" as const,
              }
            : modalAction === "delete"
              ? {
                  title: "모집글을 삭제할까요?",
                  description:
                    "삭제된 모집글은 공개 목록에서 보이지 않습니다. 이 작업은 되돌리기 어렵습니다.",
                  confirmLabel: "모집글 삭제",
                  tone: "danger" as const,
                }
              : null;

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="min-w-0">
                <p className="text-caption font-semibold text-neutral-500">
                  {guesthouse?.name ?? "—"} · {guesthouse?.region ?? "—"}
                </p>
                <h2 className="mt-2 break-words text-h3 text-neutral-800">
                  {jobPost.title}
                </h2>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <JobStatusBadge status={jobPost.status} />
                {jobPost.is_urgent && <UrgentBadge />}
                {jobPost.provides_accommodation && <AccommodationBadge />}
                {jobPost.provides_meal && <MealBadge />}
                {jobPost.has_party && (
                  <Badge variant="primary">파티 있음</Badge>
                )}
              </div>
            </div>
            <div className="flex w-full items-stretch gap-2 sm:w-32 sm:shrink-0 sm:flex-col">
              <Link
                href="/owner/applications"
                className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border border-neutral-100 bg-neutral-50 px-3 text-center transition-colors hover:border-neutral-200 hover:bg-neutral-100 focus-ring sm:flex-none"
              >
                <span className="text-body font-bold text-neutral-800">
                  {applicationCount}
                </span>
                <span className="text-caption font-medium text-neutral-500">
                  지원자
                </span>
              </Link>
              <ButtonLink
                href={`/owner/jobs/${jobPost.id}/edit`}
                size="sm"
                fullWidth
              >
                모집글 수정
              </ButtonLink>
            </div>
          </div>

          <dl className="grid gap-4 text-body-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-neutral-400">모집 인원</dt>
              <dd className="font-medium text-neutral-700">
                {jobPost.recruit_count}명
              </dd>
            </div>
            <div>
              <dt className="text-neutral-400">근무 시작일</dt>
              <dd className="font-medium text-neutral-700">
                {formatDate(jobPost.work_start_date)}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-400">최소 근무 기간</dt>
              <dd className="font-medium text-neutral-700">
                {jobPost.min_work_period}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-400">근무/휴무</dt>
              <dd className="font-medium text-neutral-700">
                주 {jobPost.work_days_per_week}일 근무 · 주{" "}
                {jobPost.off_days_per_week}일 휴무
              </dd>
            </div>
            <div>
              <dt className="text-neutral-400">숙소 제공</dt>
              <dd className="font-medium text-neutral-700">
                {jobPost.provides_accommodation ? "제공" : "미제공"}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-400">식사 제공</dt>
              <dd className="font-medium text-neutral-700">
                {jobPost.provides_meal ? "제공" : "미제공"}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-400">파티 운영</dt>
              <dd className="font-medium text-neutral-700">
                {jobPost.has_party ? "있음" : "없음"}
              </dd>
            </div>
            {jobPost.has_party && jobPost.party_description && (
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="text-neutral-400">파티 안내</dt>
                <dd className="font-medium text-neutral-700">
                  {jobPost.party_description}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-neutral-400">끌어올리기 횟수</dt>
              <dd className="font-medium text-neutral-700">
                {jobPost.bump_count}회
              </dd>
            </div>
            <div>
              <dt className="text-neutral-400">마지막 끌어올리기</dt>
              <dd className="font-medium text-neutral-700">
                {jobPost.last_bumped_at
                  ? formatDateTime(jobPost.last_bumped_at)
                  : "—"}
              </dd>
            </div>
          </dl>

          {(bumpDisabledReason || urgentDisabledReason || actionDisabledReason) && (
            <div className="space-y-1">
              {jobPost.status === "open" && bumpDisabledReason && (
                <p className="text-caption text-neutral-500">
                  {bumpDisabledReason}
                </p>
              )}
              {jobPost.status === "open" && urgentDisabledReason && (
                <p className="text-caption text-neutral-500">
                  {urgentDisabledReason}
                </p>
              )}
              {actionDisabledReason && (
                <p className="text-caption text-neutral-500">
                  {actionDisabledReason}
                </p>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="grid grid-cols-2 items-stretch gap-2 border-t border-neutral-100 pt-4 sm:flex sm:flex-row sm:flex-wrap sm:items-center lg:flex-nowrap">
          {jobPost.status === "open" && (
            <>
              <Button
                variant="soft-primary"
                size="sm"
                className="w-full sm:w-auto"
                disabled={
                  !!urgentDisabledReason ||
                  !!actionDisabledReason ||
                  isActionPending
                }
                onClick={() => openModal("urgent")}
              >
                {pendingAction === "urgent" ? "처리 중..." : "급구 처리"}
              </Button>
              <Button
                variant="soft-primary"
                size="sm"
                className="w-full sm:w-auto"
                disabled={
                  !!bumpDisabledReason ||
                  !!actionDisabledReason ||
                  isActionPending
                }
                onClick={() => openModal("bump")}
              >
                {pendingAction === "bump" ? "처리 중..." : "끌어올리기"}
              </Button>
            </>
          )}

          <ButtonLink
            href={`/owner/jobs/${jobPost.id}/applications`}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            지원자 관리
          </ButtonLink>

          {jobPost.status === "open" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-danger-muted! sm:w-auto"
              disabled={!!actionDisabledReason || isActionPending}
              onClick={() => openModal("close")}
            >
              {pendingAction === "close" ? "처리 중..." : "모집 마감"}
            </Button>
          )}

          {jobPost.status === "closed" && (
            <Button
              variant="soft-primary"
              size="sm"
              className="w-full sm:w-auto"
              disabled={!!actionDisabledReason || isActionPending}
              onClick={() => openModal("reopen")}
            >
              {pendingAction === "reopen" ? "처리 중..." : "모집중으로 변경"}
            </Button>
          )}

          {jobPost.status !== "hidden" && (
            <Button
              variant="outline-danger"
              size="sm"
              className="w-full border-danger/40 sm:w-auto"
              disabled={!!actionDisabledReason || isActionPending}
              onClick={() => openModal("delete")}
            >
              {pendingAction === "delete" ? "처리 중..." : "모집글 삭제"}
            </Button>
          )}
        </CardFooter>
      </Card>
      {modalConfig && (
        <OwnerActionModal
          open={modalAction !== null}
          title={modalConfig.title}
          description={modalConfig.description}
          confirmLabel={modalConfig.confirmLabel}
          tone={modalConfig.tone}
          pending={isActionPending}
          errorMessage={modalError}
          onConfirm={handleConfirmAction}
          onCancel={closeModal}
        />
      )}
    </>
  );
}

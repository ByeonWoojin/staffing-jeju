"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import type { Guesthouse, JobPost } from "@/types/database";
import {
  getBumpDisabledReason,
  getShareLink,
} from "@/lib/owner-data";
import { isUuid } from "@/lib/uuid";
import {
  bumpRecruitment,
  closeRecruitment,
  reopenRecruitment,
} from "@/app/owner/jobs/actions";
import {
  Button,
  ButtonLink,
  Card,
  CardContent,
  CardFooter,
  JobStatusBadge,
} from "@/components/ui";
import { OwnerActionModal } from "./OwnerActionModal";

interface RecruitmentSummaryCardProps {
  jobPost: JobPost;
  guesthouse: Guesthouse | null;
  applicationCount: number;
}

type SummaryAction = "bump" | "close" | "reopen";

export function RecruitmentSummaryCard({
  jobPost,
  guesthouse,
  applicationCount,
}: RecruitmentSummaryCardProps) {
  const router = useRouter();
  const shareLink = getShareLink(jobPost.slug);
  const canShare = jobPost.status !== "hidden";
  const bumpDisabledReason = getBumpDisabledReason(jobPost);
  const actionDisabledReason = isUuid(jobPost.id)
    ? null
    : "개발용 mock 데이터에서는 액션을 실행할 수 없습니다.";
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [modalAction, setModalAction] = useState<SummaryAction | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<SummaryAction | null>(
    null,
  );

  const stopCardNavigation = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const navigateToJobs = () => {
    router.push("/owner/jobs");
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    navigateToJobs();
  };

  const handleCopyLink = async (event: MouseEvent<HTMLButtonElement>) => {
    stopCardNavigation(event);
    if (!canShare) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopyMessage("공개 모집글 링크를 복사했습니다.");
    } catch {
      setCopyMessage("링크 복사에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const openActionModal = (
    action: SummaryAction,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    stopCardNavigation(event);
    setModalAction(action);
    setModalError(null);
  };

  const closeModal = () => {
    if (pendingAction) return;
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

    setPendingAction(modalAction);
    setModalError(null);

    try {
      if (modalAction === "bump") {
        await bumpRecruitment(jobPost.id);
      }
      if (modalAction === "close") {
        await closeRecruitment(jobPost.id);
      }
      if (modalAction === "reopen") {
        await reopenRecruitment(jobPost.id);
      }
      setModalAction(null);
      router.refresh();
    } catch (error) {
      setModalError(
        error instanceof Error ? error.message : "처리에 실패했습니다.",
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
          : null;

  return (
    <>
      <Card
        hoverable
        role="link"
        tabIndex={0}
        className="cursor-pointer focus-ring"
        onClick={navigateToJobs}
        onKeyDown={handleCardKeyDown}
      >
      <CardContent>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-caption text-neutral-500">현재 모집 상태</p>
            <div className="mt-2">
              <JobStatusBadge status={jobPost.status} />
            </div>
          </div>
          <p className="text-body-sm text-neutral-500">
            지원 {applicationCount}명
          </p>
        </div>

        <p className="mt-4 line-clamp-2 text-title text-neutral-800">
          {jobPost.title}
        </p>
        {guesthouse && (
          <p className="mt-1 text-body-sm text-neutral-500">
            {guesthouse.name} · {guesthouse.region}
          </p>
        )}
        {(bumpDisabledReason || actionDisabledReason || copyMessage) && (
          <div className="mt-3 space-y-1">
            {jobPost.status === "open" && bumpDisabledReason && (
              <p className="text-caption text-neutral-500">
                {bumpDisabledReason}
              </p>
            )}
            {actionDisabledReason && (
              <p className="text-caption text-neutral-500">
                {actionDisabledReason}
              </p>
            )}
            {copyMessage && (
              <p className="text-caption font-semibold text-primary-700">
                {copyMessage}
              </p>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        {jobPost.status === "open" && canShare && (
          <Button size="sm" onClick={handleCopyLink}>
            공유 링크 복사
          </Button>
        )}
        {jobPost.status === "open" && (
          <>
            <Button
              variant="soft-primary"
              size="sm"
              disabled={
                !!bumpDisabledReason ||
                !!actionDisabledReason ||
                pendingAction !== null
              }
              onClick={(event) => openActionModal("bump", event)}
            >
              끌어올리기
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              disabled={!!actionDisabledReason || pendingAction !== null}
              onClick={(event) => openActionModal("close", event)}
            >
              모집 마감
            </Button>
          </>
        )}
        {jobPost.status === "closed" && (
          <>
            <Button
              variant="soft-primary"
              size="sm"
              disabled={!!actionDisabledReason || pendingAction !== null}
              onClick={(event) => openActionModal("reopen", event)}
            >
              모집중으로 변경
            </Button>
            <ButtonLink
              href={`/owner/jobs/${jobPost.id}/edit`}
              variant="soft-primary"
              size="sm"
              onClick={stopCardNavigation}
            >
              모집글 수정
            </ButtonLink>
            <ButtonLink
              href={`/owner/jobs/${jobPost.id}/applications`}
              variant="outline"
              size="sm"
              onClick={stopCardNavigation}
            >
              지원자 관리
            </ButtonLink>
          </>
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
          pending={pendingAction !== null}
          errorMessage={modalError}
          onConfirm={handleConfirmAction}
          onCancel={closeModal}
        />
      )}
    </>
  );
}

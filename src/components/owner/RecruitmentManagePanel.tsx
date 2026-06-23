"use client";

import { useState } from "react";
import type { Guesthouse, JobPost } from "@/types/database";
import { formatDate, formatDateTime } from "@/lib/owner-utils";
import {
  getBumpDisabledReason,
  getShareLink,
} from "@/lib/owner-data";
import {
  AccommodationBadge,
  Button,
  ButtonLink,
  Card,
  CardContent,
  CardFooter,
  JobStatusBadge,
  MealBadge,
  UrgentBadge,
} from "@/components/ui";

interface RecruitmentManagePanelProps {
  initialJobPost: JobPost;
  guesthouse: Guesthouse | null;
  applicationCount: number;
}

export function RecruitmentManagePanel({
  initialJobPost,
  guesthouse,
  applicationCount,
}: RecruitmentManagePanelProps) {
  const [jobPost, setJobPost] = useState(initialJobPost);

  const shareLink = getShareLink(jobPost.slug);
  const bumpDisabledReason = getBumpDisabledReason(jobPost);
  const canShare = jobPost.status !== "hidden";

  const handleCopyLink = async () => {
    if (!canShare) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      //TODO: Toast로 '링크가 복사되었습니다' 표시
      alert("링크가 복사되었습니다.");
    } catch {
      alert("링크 복사에 실패했습니다.");
    }
  };

  const handleClose = () => {
    if (!confirm("모집을 마감하시겠습니까? 마감 후에는 새 지원을 받을 수 없습니다.")) {
      return;
    }
    //TODO: PATCH job_posts.status = 'closed'
    console.log("PATCH job_posts.status = closed", jobPost.id);
    setJobPost((prev) => ({
      ...prev,
      status: "closed",
      updated_at: new Date().toISOString(),
    }));
    alert("모집이 마감되었습니다.");
  };

  const handleReopen = () => {
    if (!confirm("모집을 다시 시작하시겠습니까?")) return;
    //TODO: PATCH job_posts.status = 'open'
    console.log("PATCH job_posts.status = open", jobPost.id);
    setJobPost((prev) => ({
      ...prev,
      status: "open",
      updated_at: new Date().toISOString(),
    }));
    alert("모집중으로 변경되었습니다.");
  };

  const handleBump = () => {
    if (bumpDisabledReason) return;

    // TODO: PATCH job_posts bumped_at, last_bumped_at, bump_count
    // TODO: only allow bump when status === 'open'
    // TODO: block bump if last_bumped_at is within 24 hours
    console.log("PATCH job_posts bump", jobPost.id);

    const now = new Date().toISOString();
    setJobPost((prev) => ({
      ...prev,
      bumped_at: now,
      last_bumped_at: now,
      bump_count: prev.bump_count + 1,
      updated_at: now,
    }));
    alert("모집글이 끌어올려졌습니다.");
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 pt-5 md:pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-caption font-semibold text-neutral-500">
              {guesthouse?.name ?? "—"} · {guesthouse?.region ?? "—"}
            </p>
            <h2 className="mt-2 text-h3 text-neutral-800">{jobPost.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <JobStatusBadge status={jobPost.status} />
              {jobPost.is_urgent && <UrgentBadge />}
              {jobPost.provides_accommodation && <AccommodationBadge />}
              {jobPost.provides_meal && <MealBadge />}
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-center shrink-0">
            <p className="text-h2 font-bold text-neutral-800">
              {applicationCount}
            </p>
            <p className="text-caption text-neutral-500">지원자</p>
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

        {canShare ? (
          <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-4">
            <p className="text-body-sm font-semibold text-neutral-700">
              공유 링크
            </p>
            <p className="mt-2 break-all text-body-sm text-neutral-600">
              {shareLink}
            </p>
            <Button className="mt-3" size="sm" onClick={handleCopyLink}>
              공유 링크 복사
            </Button>
          </div>
        ) : (
          <div className="rounded-md border border-neutral-200 bg-neutral-100 px-4 py-4">
            <p className="text-body-sm text-neutral-600">
              숨김 상태의 모집글은 일반 공유 링크로 노출되지 않습니다. 관리자
              확인이 필요할 수 있습니다.
            </p>
          </div>
        )}

        {jobPost.status === "open" && bumpDisabledReason && (
          <p className="text-caption text-neutral-500">{bumpDisabledReason}</p>
        )}
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-3 border-t border-neutral-100 px-5 pb-5 sm:flex-row sm:flex-wrap sm:items-center md:px-6 md:pb-6">
        <ButtonLink
          href={`/owner/jobs/${jobPost.id}/edit`}
          variant="outline"
          size="sm"
        >
          모집글 수정
        </ButtonLink>
        <ButtonLink
          href={`/owner/jobs/${jobPost.id}/applications`}
          variant="secondary"
          size="sm"
        >
          지원자 관리
        </ButtonLink>

        {jobPost.status === "open" && (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={!!bumpDisabledReason}
              onClick={handleBump}
            >
              끌어올리기
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={handleClose}
            >
              모집 마감
            </Button>
          </>
        )}

        {jobPost.status === "closed" && (
          <Button size="sm" onClick={handleReopen}>
            모집중으로 변경
          </Button>
        )}

        {canShare && (
          <Button variant="ghost" size="sm" onClick={handleCopyLink}>
            공유 링크 복사
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

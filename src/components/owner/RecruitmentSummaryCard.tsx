"use client";

import type { Guesthouse, JobPost } from "@/types/database";
import { getRecruitmentStatusMessage, getShareLink } from "@/lib/owner-data";
import { getJobStatusLabel } from "@/lib/labels";
import {
  Button,
  ButtonLink,
  Card,
  CardContent,
  CardFooter,
  JobStatusBadge,
} from "@/components/ui";

interface RecruitmentSummaryCardProps {
  jobPost: JobPost;
  guesthouse: Guesthouse | null;
  applicationCount: number;
}

export function RecruitmentSummaryCard({
  jobPost,
  guesthouse,
  applicationCount,
}: RecruitmentSummaryCardProps) {
  const shareLink = getShareLink(jobPost.slug);
  const canShare = jobPost.status !== "hidden";

  const handleCopyLink = async () => {
    if (!canShare) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      alert("링크가 복사되었습니다.");
    } catch {
      alert("링크 복사에 실패했습니다.");
    }
  };

  return (
    <Card>
      <CardContent className="pt-5 md:pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-caption text-neutral-500">현재 모집 상태</p>
            <div className="mt-2 flex items-center gap-2">
              <JobStatusBadge status={jobPost.status} />
              <span className="text-body-sm text-neutral-600">
                {getJobStatusLabel(jobPost.status)}
              </span>
            </div>
          </div>
          <p className="text-body-sm text-neutral-500">
            지원 {applicationCount}명
          </p>
        </div>

        <p className="mt-4 text-title text-neutral-800">{jobPost.title}</p>
        {guesthouse && (
          <p className="mt-1 text-body-sm text-neutral-500">
            {guesthouse.name} · {guesthouse.region}
          </p>
        )}
        <p className="mt-3 text-body-sm text-neutral-600">
          {getRecruitmentStatusMessage(jobPost.status)}
        </p>
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        {canShare && (
          <Button size="sm" onClick={handleCopyLink}>
            공유 링크 복사
          </Button>
        )}
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
        <ButtonLink href="/owner/jobs" variant="ghost" size="sm">
          모집 관리
        </ButtonLink>
      </CardFooter>
    </Card>
  );
}

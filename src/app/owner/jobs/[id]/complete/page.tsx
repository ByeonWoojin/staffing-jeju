"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { ShareLinkBox } from "@/components/owner";
import {
  getCurrentOwnerMock,
  getGuesthouseByIdMock,
  getOwnerJobPostByIdMock,
} from "@/lib/owner-data";
import {
  clearCreatedJobPostFromSession,
  getCreatedJobPostFromSession,
} from "@/lib/owner-utils";
import type { JobPost } from "@/types/database";
import { ButtonLink, Card, CardContent, PageHeader, Section } from "@/components/ui";

function getInitialJobPost(jobPostId: string) {
  //TODO: GET job_posts by id where owner_id = currentOwner.id
  const owner = getCurrentOwnerMock();

  const fromSession = getCreatedJobPostFromSession<JobPost>();
  if (fromSession && fromSession.id === jobPostId) {
    return fromSession;
  }

  return getOwnerJobPostByIdMock(owner.id, jobPostId);
}

export default function JobCompletePage() {
  const params = useParams();
  const jobPostId = params.id as string;
  const [jobPost] = useState<JobPost | null>(() => getInitialJobPost(jobPostId));
  const guesthouseName = jobPost
    ? (getGuesthouseByIdMock(jobPost.guesthouse_id)?.name ?? "")
    : "";

  if (!jobPost) {
    return (
      <OwnerLayout>
        <PageHeader title="모집글을 찾을 수 없습니다." />
        <ButtonLink href="/owner/jobs">모집글 관리</ButtonLink>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <PageHeader
        title="스탭 모집글 작성이 완료되었습니다."
        description="아래 공유 링크를 네이버 카페, 인스타, 카카오톡 등에 공유해보세요."
      />

      <Section spacing="sm">
        <Card>
          <CardContent className="pt-5 md:pt-6">
            <p className="text-body-sm text-neutral-500">모집글 제목</p>
            <p className="mt-1 text-title text-neutral-800">{jobPost.title}</p>
            {guesthouseName && (
              <>
                <p className="mt-4 text-body-sm text-neutral-500">
                  게스트하우스
                </p>
                <p className="mt-1 text-body text-neutral-700">
                  {guesthouseName}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </Section>

      <Section title="공유 링크" spacing="sm">
        <ShareLinkBox slug={jobPost.slug} />
      </Section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <ButtonLink href="/owner/jobs">모집글 관리</ButtonLink>
        <ButtonLink
          href={`/owner/jobs/${jobPost.id}/applications`}
          variant="secondary"
        >
          지원자 관리
        </ButtonLink>
        <ButtonLink
          href={`/owner/jobs/${jobPost.id}/edit`}
          variant="outline"
          onClick={() => clearCreatedJobPostFromSession()}
        >
          모집글 수정
        </ButtonLink>
      </div>
    </OwnerLayout>
  );
}

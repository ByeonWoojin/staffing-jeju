import { notFound } from "next/navigation";
import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { ApplicationDetail } from "@/components/owner";
import { getApplicationWithOwnerCheckMock } from "@/lib/owner-data";
import { ButtonLink, PageHeader } from "@/components/ui";

interface ApplicationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  const { id } = await params;

  //TODO: GET application by id joined with job_posts
  //TODO: Check job_posts.owner_id === currentOwner.id
  //TODO: If application.status === 'submitted', PATCH applications.status = 'viewed'
  //TODO: INSERT application_status_logs from submitted to viewed

  const result = getApplicationWithOwnerCheckMock("owner_001", id);

  if (!result) {
    notFound();
  }

  const { application, job_post } = result;

  return (
    <OwnerLayout>
      <PageHeader
        title={`${application.name}님의 지원서`}
        description="현재 모집글 · 우리 게하에 지원한 스탭"
        action={
          <ButtonLink
            href={`/owner/jobs/${job_post.id}/applications`}
            variant="outline"
          >
            목록으로
          </ButtonLink>
        }
      />
      <ApplicationDetail application={application} jobPost={job_post} />
    </OwnerLayout>
  );
}

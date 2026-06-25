import { notFound } from "next/navigation";
import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { ApplicationDetail } from "@/components/owner";
import { markApplicationViewed } from "@/app/owner/applications/actions";
import { getApplicationWithOwnerCheck } from "@/lib/owner-supabase-data";
import { isUuid } from "@/lib/uuid";
import { ButtonLink, PageHeader } from "@/components/ui";

interface ApplicationDetailPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  const { id } = await params;

  let result = await getApplicationWithOwnerCheck(id);

  if (!result) {
    notFound();
  }

  if (result.application.status === "submitted" && isUuid(result.application.id)) {
    await markApplicationViewed(result.application.id);
    result = await getApplicationWithOwnerCheck(id);

    if (!result) {
      notFound();
    }
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

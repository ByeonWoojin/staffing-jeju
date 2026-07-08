import { notFound } from "next/navigation";
import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { ApplicantList } from "@/components/owner";
import {
  getApplicationsByJobPostId,
  getCurrentOwner,
  getOwnerGuesthouse,
  getOwnerJobPostById,
} from "@/lib/owner-supabase-data";
import {
  ButtonLink,
  EmptyState,
  JobStatusBadge,
  PageHeader,
  Section,
  UrgentBadge,
} from "@/components/ui";

interface ApplicationsPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function JobApplicationsPage({
  params,
}: ApplicationsPageProps) {
  const { id } = await params;

  //TODO: GET job_post by id where owner_id = currentOwner.id
  //TODO: GET applications where job_post_id = currentJobPost.id

  const owner = await getCurrentOwner();
  const jobPost = await getOwnerJobPostById(owner.id, id);

  if (!jobPost) {
    notFound();
  }

  const applications = await getApplicationsByJobPostId(jobPost.id);
  const guesthouse = await getOwnerGuesthouse(owner.id);

  return (
    <OwnerLayout>
      <PageHeader
        title="현재 모집글 지원자"
        description="우리 게하에 지원한 스탭 목록입니다."
        action={
          <ButtonLink href={`/owner/jobs/${jobPost.id}/edit`} variant="outline">
            모집글 수정
          </ButtonLink>
        }
      />

      <Section spacing="sm">
        <div className="flex flex-wrap items-center gap-2">
          <JobStatusBadge status={jobPost.status} />
          {jobPost.is_urgent && <UrgentBadge />}
          <span className="text-body-sm font-semibold text-neutral-800">
            {jobPost.title}
          </span>
          {guesthouse && (
            <span className="text-body-sm text-neutral-500">
              · {guesthouse.name}
            </span>
          )}
        </div>
      </Section>

      {applications.length === 0 ? (
        <EmptyState
          title="아직 지원자가 없습니다."
          description="공유 링크를 통해 스탭을 모집해보세요."
          action={
            <ButtonLink href="/owner/jobs">모집글 관리</ButtonLink>
          }
        />
      ) : (
        <ApplicantList applications={applications} />
      )}
    </OwnerLayout>
  );
}

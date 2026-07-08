import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { RecruitmentManagePanel } from "@/components/owner";
import { getOwnerJobsPageData } from "@/lib/owner-supabase-data";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  //TODO: GET current job_post where owner_id = currentOwner.id
  //TODO: GET applications count for current job_post

  const { currentJobPost, guesthouse, applicationCount } =
    await getOwnerJobsPageData();

  return (
    <OwnerLayout>
      <PageHeader
        title="우리 게하 모집글 관리"
        description="운영 중인 스탭 모집글을 수정하고, 모집 상태를 관리합니다."
        action={
          !currentJobPost ? (
            <ButtonLink href="/onboarding/owner/job-post">
              모집글 등록하기
            </ButtonLink>
          ) : undefined
        }
      />

      {currentJobPost ? (
        <RecruitmentManagePanel
          initialJobPost={currentJobPost}
          guesthouse={guesthouse}
          applicationCount={applicationCount}
        />
      ) : (
        <EmptyState
          title="등록된 모집글이 없습니다."
          description="새 모집글을 등록해 스탭 모집을 시작해보세요."
          action={
            <ButtonLink href="/onboarding/owner/job-post">
              모집글 등록하기
            </ButtonLink>
          }
        />
      )}
    </OwnerLayout>
  );
}

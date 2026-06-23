import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { RecruitmentManagePanel } from "@/components/owner";
import {
  getCurrentJobPostMock,
  getCurrentOwnerMock,
  getOwnerGuesthouseMock,
} from "@/lib/owner-data";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";

export default function JobsPage() {
  //TODO: GET current job_post where owner_id = currentOwner.id
  //TODO: GET applications count for current job_post

  const owner = getCurrentOwnerMock();
  const currentJobPost = getCurrentJobPostMock(owner.id);
  const guesthouse = getOwnerGuesthouseMock(owner.id);

  return (
    <OwnerLayout>
      <PageHeader
        title="우리 게하 스탭 모집 관리"
        description="운영 중인 스탭 모집글을 수정하고, 모집 상태를 관리합니다."
        action={
          !currentJobPost ? (
            <ButtonLink href="/owner/jobs/new">스탭 모집글 작성하기</ButtonLink>
          ) : undefined
        }
      />

      {currentJobPost ? (
        <RecruitmentManagePanel
          initialJobPost={currentJobPost}
          guesthouse={guesthouse}
        />
      ) : (
        <EmptyState
          title="아직 스탭 모집글이 없습니다."
          description="우리 게하의 첫 스탭 모집글을 작성해보세요."
          action={
            <ButtonLink href="/owner/jobs/new">스탭 모집글 작성하기</ButtonLink>
          }
        />
      )}
    </OwnerLayout>
  );
}

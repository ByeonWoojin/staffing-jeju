import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { RecentApplicantList } from "@/components/owner";
import {
  getCurrentJobPostMock,
  getCurrentOwnerMock,
  getOwnerApplicationsMock,
} from "@/lib/owner-data";
import { ButtonLink, EmptyState, PageHeader, Section } from "@/components/ui";

export default function AllApplicationsPage() {
  //TODO: GET applications for current job_post where owner_id = currentOwner.id

  const owner = getCurrentOwnerMock();
  const currentJobPost = getCurrentJobPostMock(owner.id);
  const applications = getOwnerApplicationsMock(owner.id);

  return (
    <OwnerLayout>
      <PageHeader
        title="지원자 관리"
        description="현재 모집글에 지원한 스탭을 확인하고 상태를 관리합니다."
        action={
          currentJobPost ? (
            <ButtonLink href="/owner/jobs" variant="outline">
              스탭 모집 관리
            </ButtonLink>
          ) : undefined
        }
      />

      {applications.length === 0 ? (
        <EmptyState
          title="지원자가 없습니다."
          description="모집글을 작성하고 공유하면 지원자 목록이 여기에 표시됩니다."
          action={
            currentJobPost ? (
              <ButtonLink href="/owner/jobs">스탭 모집 관리</ButtonLink>
            ) : (
              <ButtonLink href="/owner/jobs/new">스탭 모집글 작성하기</ButtonLink>
            )
          }
        />
      ) : (
        <Section title={`우리 게하에 지원한 스탭 ${applications.length}명`}>
          <RecentApplicantList applications={applications} />
        </Section>
      )}
    </OwnerLayout>
  );
}

import { OwnerLayout } from "@/components/layout/OwnerLayout";
import {
  GuesthouseSummaryCard,
  OwnerDashboardCard,
  RecentApplicantList,
  RecruitmentSummaryCard,
} from "@/components/owner";
import { getOwnerDashboardData } from "@/lib/owner-supabase-data";
import { ButtonLink, EmptyState, PageHeader, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OwnerHomePage() {
  //TODO: GET current owner profile
  //TODO: GET guesthouses where owner_id = currentOwner.id
  //TODO: GET current job_post for guesthouse
  //TODO: GET applications for current job_post

  const { owner, guesthouse, current_job_post, applications, stats } =
    await getOwnerDashboardData();

  const recentApplications = applications.slice(0, 5);

  return (
    <OwnerLayout>
      <PageHeader
        title={`${owner.name}님, 우리 게하 스탭 모집 현황입니다.`}
        description="현재 운영 중인 스탭 모집글과 지원자를 확인하세요."
      />

      <Section title="요약">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <OwnerDashboardCard
            label="총 지원자"
            value={stats.total_application_count}
          />
          <OwnerDashboardCard
            label="신규 지원"
            value={stats.new_application_count}
            description="아직 열람하지 않은 지원"
          />
          <OwnerDashboardCard
            label="모집 인원"
            value={current_job_post ? `${current_job_post.recruit_count}명` : "—"}
          />
        </div>
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="우리 게하">
          <GuesthouseSummaryCard guesthouse={guesthouse} />
        </Section>

        <Section title="스탭 모집글">
          {current_job_post ? (
            <RecruitmentSummaryCard
              jobPost={current_job_post}
              guesthouse={guesthouse}
              applicationCount={stats.total_application_count}
            />
          ) : (
            <EmptyState
              title="등록된 모집글이 없습니다."
              description="새 모집글을 등록해 스탭 모집을 시작해보세요."
              action={
                <ButtonLink href="/onboarding/owner/job-post" size="sm">
                  모집글 등록하기
                </ButtonLink>
              }
            />
          )}
        </Section>
      </div>

      <Section
        title="최근 지원자"
        action={
          current_job_post ? (
            <ButtonLink
              href={`/owner/jobs/${current_job_post.id}/applications`}
              variant="outline"
              size="sm"
            >
              지원자 관리
            </ButtonLink>
          ) : undefined
        }
      >
        {recentApplications.length === 0 ? (
          <EmptyState
            title="아직 지원자가 없습니다."
            description="모집글을 공유하면 지원자가 들어옵니다."
          />
        ) : (
          <RecentApplicantList applications={recentApplications} />
        )}
      </Section>
    </OwnerLayout>
  );
}

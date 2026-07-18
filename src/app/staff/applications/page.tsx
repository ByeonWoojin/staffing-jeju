import { getStaffApplicationsData } from "@/lib/staff-application-data";
import { AppHeader } from "@/components/layout/AppHeader";
import { StaffApplicationsStatusList } from "@/components/staff/StaffApplicationsStatusList";
import {
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StaffApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const submitted = params.submitted === "1";
  const focusChanged = params.focus === "changed";
  const { profile, items, authorized } = await getStaffApplicationsData();
  const applicationStatusSummaries = items
    .filter(({ jobPost }) => Boolean(jobPost))
    .map(({ application, statusChangedAt }) => ({
      applicationId: application.id,
      status: application.status,
      statusChangedAt,
    }));

  if (!authorized) {
    return (
      <main className="min-h-screen bg-neutral-50">
        <AppHeader active="applications" isAuthenticated />
        <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
          <EmptyState
            title="스탭 계정에서 사용할 수 있는 페이지입니다."
            description={`${profile.name}님 계정에서는 지원 현황을 사용할 수 없습니다.`}
            action={<ButtonLink href="/jobs">모집글 둘러보기</ButtonLink>}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <AppHeader
        active="applications"
        isAuthenticated
        staffId={profile.id}
        applicationStatusSummaries={applicationStatusSummaries}
      />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <PageHeader
          title="내 지원 현황"
          description="제출한 지원서와 현재 지원 상태를 확인할 수 있습니다."
          action={<ButtonLink href="/jobs">공고 둘러보기</ButtonLink>}
        />

        {submitted && (
          <Card className="border-primary-100 bg-primary-50/60">
            <p className="text-body-sm font-bold text-primary-700">
              지원서가 제출되었습니다.
            </p>
            <p className="mt-1 text-body-sm text-neutral-600">
              사장님이 확인하면 지원 상태가 변경됩니다.
            </p>
          </Card>
        )}

        {items.length === 0 ? (
          <EmptyState
            title="아직 지원한 모집글이 없습니다."
            description="마음에 드는 공고를 찾아 지원해보세요."
            action={<ButtonLink href="/jobs">공고 둘러보기</ButtonLink>}
          />
        ) : (
          <StaffApplicationsStatusList
            items={items}
            staffId={profile.id}
            focusChanged={focusChanged}
          />
        )}
      </div>
    </main>
  );
}

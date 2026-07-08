import Link from "next/link";
import { getStaffApplicationsData } from "@/lib/staff-application-data";
import { formatDate } from "@/lib/owner-utils";
import { AppHeader } from "@/components/layout/AppHeader";
import { CancelApplicationButton } from "@/components/jobs/CancelApplicationButton";
import {
  ApplicationStatusBadge,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
} from "@/components/ui";

export const dynamic = "force-dynamic";

function ApplicationPhoto({
  src,
  alt,
}: {
  src: string | null | undefined;
  alt: string;
}) {
  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-beige">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center px-2 text-center text-caption font-semibold text-brown">
          사진 없음
        </div>
      )}
    </div>
  );
}

export default async function StaffApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const submitted = params.submitted === "1";
  const { profile, items, authorized } = await getStaffApplicationsData();

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
      <AppHeader active="applications" isAuthenticated />
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
          <div className="grid gap-4">
            {items.map(({ application, jobPost, guesthouse }) => {
              const canCancel =
                application.status === "submitted" ||
                application.status === "viewed";

              return (
                <Card
                  key={application.id}
                  className="flex flex-col gap-4 sm:flex-row sm:items-start"
                >
                  <ApplicationPhoto
                    src={application.representativePhotoUrl}
                    alt={`${application.name} 대표사진`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-caption font-semibold text-neutral-500">
                          {guesthouse
                            ? `${guesthouse.name} · ${guesthouse.region}`
                            : "게스트하우스 정보 없음"}
                        </p>
                        <h2 className="mt-1 line-clamp-2 text-title text-neutral-900">
                          {jobPost?.title ?? "모집글 정보 없음"}
                        </h2>
                      </div>
                      <ApplicationStatusBadge status={application.status} />
                    </div>

                    <dl className="mt-4 grid gap-3 text-body-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-caption font-semibold text-neutral-400">
                          지원일
                        </dt>
                        <dd className="mt-1 text-neutral-700">
                          {formatDate(application.created_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-caption font-semibold text-neutral-400">
                          입도 가능일
                        </dt>
                        <dd className="mt-1 text-neutral-700">
                          {formatDate(application.available_start_date)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-caption font-semibold text-neutral-400">
                          근무 시작일
                        </dt>
                        <dd className="mt-1 text-neutral-700">
                          {jobPost ? formatDate(jobPost.work_start_date) : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-caption font-semibold text-neutral-400">
                          가능 근무 기간
                        </dt>
                        <dd className="mt-1 text-neutral-700">
                          {application.available_work_period}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {jobPost?.slug && (
                        <Link
                          href={`/jobs/${jobPost.slug}`}
                          className="inline-flex h-9 items-center rounded-md border border-neutral-200 bg-neutral-0 px-4 text-body-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-ring"
                        >
                          모집글 보기
                        </Link>
                      )}
                      {canCancel && (
                        <CancelApplicationButton applicationId={application.id} />
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

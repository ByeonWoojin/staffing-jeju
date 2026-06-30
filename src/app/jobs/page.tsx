import Image from "next/image";
import Link from "next/link";
import { getCurrentAuthUser } from "@/lib/auth/onboarding";
import { getPublicJobs } from "@/lib/public-job-data";
import { formatDate } from "@/lib/owner-utils";
import { HeaderLoginButton } from "@/components/auth/HeaderLoginButton";
import { FavoriteGuesthouseButton } from "@/components/jobs/FavoriteGuesthouseButton";
import { JobsFilterBar } from "@/components/jobs/JobsFilterBar";
import { Badge, Card, EmptyState, UrgentBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

function JobCard({
  job,
}: {
  job: Awaited<ReturnType<typeof getPublicJobs>>["jobs"][number];
}) {
  const { jobPost, guesthouse, imageUrl, isFavorited } = job;
  const positiveChips = [
    jobPost.provides_accommodation ? "숙소 제공" : null,
    jobPost.provides_meal ? "식사 제공" : null,
    jobPost.stipend_type !== "none" ? "급여 있음" : null,
    jobPost.has_party ? "파티 있음" : null,
  ].filter((label): label is string => Boolean(label));

  return (
    <Card
      hoverable
      padding="none"
      className="group relative border-transparent bg-transparent shadow-none"
    >
      <Link
        href={`/jobs/${jobPost.slug}`}
        className="absolute inset-0 z-10 rounded-lg focus-ring"
        aria-label={`${jobPost.title} 상세 보기`}
      />
      <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-beige">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${guesthouse.name} 대표 이미지`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-body-sm font-semibold text-brown">
            사진 준비 중
          </div>
        )}
        <div className="absolute right-3 top-3 z-20">
          <FavoriteGuesthouseButton
            guesthouseId={guesthouse.id}
            initialFavorited={isFavorited}
            presentation="icon"
            className="h-10 w-10 rounded-full px-0 text-lg"
          />
        </div>
        {jobPost.is_urgent && (
          <div className="absolute left-3 top-3">
            <UrgentBadge />
          </div>
        )}
      </div>

      <div className="relative z-0 pt-3 transition-colors group-hover:text-primary-700">
        <p className="truncate text-body-sm font-bold text-neutral-900">
          {guesthouse.name} · {guesthouse.region}
        </p>
        <h2 className="mt-1 line-clamp-2 min-h-[2.75rem] text-body-sm font-semibold text-neutral-800">
          {jobPost.title}
        </h2>
        <p className="mt-1 truncate text-caption text-neutral-500">
          입도일 {formatDate(jobPost.work_start_date)}
        </p>
        <p className="mt-0.5 truncate text-caption text-neutral-500">
          최소 {jobPost.min_work_period} · 주 {jobPost.work_days_per_week}일 근무 · 주{" "}
          {jobPost.off_days_per_week}일 휴무
        </p>
        <div className="mt-3 flex min-h-6 gap-1.5 overflow-hidden">
          {positiveChips.slice(0, 3).map((label) => (
            <Badge
              key={label}
              variant="default"
              className="h-5 max-w-[6.5rem] shrink-0 truncate border border-neutral-200 bg-neutral-0 px-2 text-[11px] font-semibold text-neutral-600"
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default async function PublicJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const [{ jobs, filters }, user] = await Promise.all([
    getPublicJobs(resolvedSearchParams),
    getCurrentAuthUser(),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-neutral-0">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/jobs" className="flex min-w-0 items-center gap-2 focus-ring">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-500 text-body-sm font-bold text-white">
              S
            </span>
            <span className="hidden truncate text-title font-bold text-neutral-900 sm:block">
              스탭핑
            </span>
          </Link>
          <nav
            aria-label="스탭 메뉴"
            className="flex shrink-0 items-center gap-1 text-caption font-bold text-neutral-700 sm:gap-2 sm:text-body-sm"
          >
            <Link
              href="/staff/favorites"
              className="rounded-md px-2.5 py-2 transition-colors hover:bg-neutral-100 focus-ring sm:px-3"
            >
              관심 공고
            </Link>
            <Link
              href="/staff/applications"
              className="rounded-md px-2.5 py-2 transition-colors hover:bg-neutral-100 focus-ring sm:px-3"
            >
              지원 현황
            </Link>
            {user ? (
              <Link
                href="/mypage"
                className="rounded-md border border-neutral-200 px-2.5 py-2 transition-colors hover:bg-neutral-50 focus-ring sm:px-3"
              >
                프로필
              </Link>
            ) : (
              <HeaderLoginButton />
            )}
          </nav>
        </div>
      </header>

      <section className="border-b border-neutral-100 bg-neutral-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-4 text-center md:px-6 md:py-5">
          <div>
            <h1 className="text-h2 text-neutral-900">
              제주 게스트하우스 스탭 모집
            </h1>
            <p className="mx-auto mt-1 max-w-xl text-body-sm text-neutral-600">
              제주에서 머물며 일할 게스트하우스를 찾아보세요.
            </p>
          </div>
        </div>
      </section>

      <JobsFilterBar filters={filters} />

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-6 md:py-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-title text-neutral-900">
              조건에 맞는 제주 스탭 공고
            </h2>
            <p className="mt-1 text-body-sm font-semibold text-neutral-500">
              조건에 맞는 모집글 {jobs.length}개
            </p>
          </div>
        </div>

        {jobs.length === 0 ? (
          <EmptyState
            className="mt-2"
            title="현재 조건에 맞는 모집 공고가 없습니다."
            description="필터를 조정하거나 나중에 다시 확인해주세요."
          />
        ) : (
          <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {jobs.map((job) => (
              <JobCard key={job.jobPost.id} job={job} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";
import { getCurrentAuthUser } from "@/lib/auth/onboarding";
import { getPublicJobs } from "@/lib/public-job-data";
import { formatDate } from "@/lib/owner-utils";
import { FavoriteGuesthouseButton } from "@/components/jobs/FavoriteGuesthouseButton";
import { JobsFilterBar } from "@/components/jobs/JobsFilterBar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Badge, Card, EmptyState, UrgentBadge } from "@/components/ui";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

type JobsSearchParams = Record<string, string | string[] | undefined>;

function createPageHref(searchParams: JobsSearchParams, page: number) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || value === undefined) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) params.append(key, item);
      }
      continue;
    }

    if (value) params.set(key, value);
  }

  params.set("page", String(page));
  return `/jobs?${params.toString()}`;
}

function getVisiblePageNumbers(currentPage: number, totalPages: number) {
  const maxVisiblePages = 5;
  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const halfWindow = Math.floor(maxVisiblePages / 2);
  let start = Math.max(1, currentPage - halfWindow);
  const end = Math.min(totalPages, start + maxVisiblePages - 1);

  if (end - start + 1 < maxVisiblePages) {
    start = Math.max(1, end - maxVisiblePages + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function JobsPagination({
  pagination,
  searchParams,
}: {
  pagination: Awaited<ReturnType<typeof getPublicJobs>>["pagination"];
  searchParams: JobsSearchParams;
}) {
  if (pagination.totalPages <= 1) return null;

  const { currentPage, totalPages } = pagination;
  const pageNumbers = getVisiblePageNumbers(currentPage, totalPages);
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const baseButtonClassName =
    "inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-caption font-bold transition-colors focus-ring";
  const enabledButtonClassName =
    "border-transparent bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900";
  const disabledButtonClassName =
    "cursor-not-allowed border-transparent bg-transparent text-neutral-300";

  return (
    <nav
      aria-label="모집글 페이지네이션"
      className="mt-1 flex justify-center border-t border-neutral-100 pt-3"
    >
      <div className="flex flex-wrap items-center justify-center gap-0.5">
        {hasPrevious ? (
          <Link
            href={createPageHref(searchParams, currentPage - 1)}
            className={cn(baseButtonClassName, enabledButtonClassName)}
            aria-label="이전 페이지로 이동"
          >
            &lt;
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={cn(baseButtonClassName, disabledButtonClassName)}
          >
            &lt;
          </span>
        )}

        {pageNumbers.map((page) =>
          page === currentPage ? (
            <span
              key={page}
              aria-current="page"
              className={cn(
                baseButtonClassName,
                "border-primary-500 bg-primary-500 px-0 text-white",
              )}
            >
              {page}
            </span>
          ) : (
            <Link
              key={page}
              href={createPageHref(searchParams, page)}
              className={cn(baseButtonClassName, enabledButtonClassName, "px-0")}
              aria-label={`${page}페이지로 이동`}
            >
              {page}
            </Link>
          ),
        )}

        {hasNext ? (
          <Link
            href={createPageHref(searchParams, currentPage + 1)}
            className={cn(baseButtonClassName, enabledButtonClassName)}
            aria-label="다음 페이지로 이동"
          >
            &gt;
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={cn(baseButtonClassName, disabledButtonClassName)}
          >
            &gt;
          </span>
        )}
      </div>
    </nav>
  );
}

function JobCard({
  job,
}: {
  job: Awaited<ReturnType<typeof getPublicJobs>>["jobs"][number];
}) {
  const { jobPost, guesthouse, imageUrl, isFavorited } = job;
  const isClosed = jobPost.status === "closed";
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
        {isClosed && <div className="absolute inset-0 bg-neutral-900/35" />}
        <div className="absolute right-3 top-3 z-20">
          <FavoriteGuesthouseButton
            guesthouseId={guesthouse.id}
            initialFavorited={isFavorited}
            presentation="icon"
            className="h-10 w-10 rounded-full px-0 text-lg"
          />
        </div>
        {isClosed ? (
          <div className="absolute left-3 top-3">
            <Badge className="h-6 border border-neutral-600/20 bg-neutral-900/75 px-2 text-[12px] font-bold text-white">
              모집 마감
            </Badge>
          </div>
        ) : jobPost.is_urgent ? (
          <div className="absolute left-3 top-3">
            <UrgentBadge />
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "relative z-0 pt-3 transition-colors group-hover:text-primary-700",
          isClosed && "opacity-70",
        )}
      >
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
  const [{ jobs, filters, pagination }, user] = await Promise.all([
    getPublicJobs(resolvedSearchParams),
    getCurrentAuthUser(),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50">
      <AppHeader isAuthenticated={Boolean(user)} />

      <section className="bg-neutral-0">
        <div className="mx-auto w-full max-w-7xl px-4 pb-2 pt-1 text-center md:px-6 md:pb-3 md:pt-2">
          <div>
            <h1 className="text-title text-neutral-900 md:text-h2">
              제주 게스트하우스 스탭 모집
            </h1>
            <p className="mx-auto mt-0.5 max-w-xl text-body-sm text-neutral-600">
              제주에서 머물며 일할 게스트하우스를 찾아보세요.
            </p>
          </div>
        </div>
      </section>

      <JobsFilterBar filters={filters} />

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-title text-neutral-900">
              조건에 맞는 제주 스탭 공고
            </h2>
            <p className="mt-1 text-body-sm font-semibold text-neutral-500">
              조건에 맞는 모집글 {pagination.totalCount}개
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

        <JobsPagination
          pagination={pagination}
          searchParams={resolvedSearchParams}
        />
      </section>
    </main>
  );
}

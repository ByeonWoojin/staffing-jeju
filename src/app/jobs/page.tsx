import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import { getPublicJobs } from "@/lib/public-job-data";
import { AnalyticsEventTracker } from "@/components/analytics/AnalyticsEventTracker";
import { CrawledJobsSection } from "@/components/jobs/CrawledJobsSection";
import { JobCard } from "@/components/jobs/JobCard";
import { JobsCarousel } from "@/components/jobs/JobsCarousel";
import { JobsFilterBar } from "@/components/jobs/JobsFilterBar";
import { ARROW_PATH, JobsMoreTile } from "@/components/jobs/JobsMoreTile";
import { AppHeader } from "@/components/layout/AppHeader";
import { RoleCoachmarkController } from "@/components/onboarding/RoleCoachmarkController";
import { EmptyState } from "@/components/ui";
import { COACHMARK_TARGETS } from "@/lib/onboarding/coachmark-config";
import { buildFilterQuery } from "@/lib/jobs/filter-query";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

// 한 화면 8개(2줄 × 4열) + 옆으로 넘기면 15개 더 = 카드 23개, 마지막 칸은 전체보기 타일
const CAROUSEL_MAX_CARDS = 23;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "제주 게스트하우스 스탭 모집글 찾기",
  description:
    "제주 게스트하우스 스탭 모집글을 스탭핑에서 확인해 보세요. 지역, 입도 가능일, 근무 조건을 기준으로 공고를 탐색할 수 있습니다. 관심 모집글을 저장하고 원하는 게스트하우스에 지원할 수 있습니다.",
  alternates: {
    canonical: "/jobs",
  },
  openGraph: {
    title: "제주 게스트하우스 스탭 모집글 찾기 | 스탭핑",
    description:
      "제주 지역과 입도 가능일, 근무 조건을 비교해 자신에게 맞는 게스트하우스 모집글을 찾아보세요.",
    url: "/jobs",
    images: [
      {
        url: "/images/og/staffing-og.png",
        alt: "스탭핑 제주 게스트하우스 스탭 모집글 목록",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "제주 게스트하우스 스탭 모집글 찾기 | 스탭핑",
    description:
      "제주 게스트하우스 모집글을 지역과 근무 조건별로 찾아볼 수 있습니다.",
    images: ["/images/og/staffing-og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function PublicJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  // 캐러셀은 항상 첫 화면(최대 23개)만 보여주므로 page 파라미터는 무시한다. 나머지는 전체보기에서 페이지로 본다.
  const [{ jobs, filters, pagination }, user] = await Promise.all([
    getPublicJobs({ ...resolvedSearchParams, page: undefined }, { pageSize: CAROUSEL_MAX_CARDS }),
    getCurrentAuthUser(),
  ]);
  const viewerProfile = user ? await getProfileById(user.id) : null;
  const viewerRole = viewerProfile?.role === "staff" ? "staff" : null;
  const moreHref = `/jobs/owner_list${buildFilterQuery(resolvedSearchParams)}`; // 걸려 있는 필터를 그대로 유지

  const heading = (
    <div>
      <div className="flex items-center gap-2">
        <h2 className="text-title text-neutral-900">조건에 맞는 제주 스탭 공고</h2>
        <Link
          href={moreHref}
          aria-label="조건에 맞는 모집글 전체보기"
          className="inline-flex size-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition-colors hover:bg-neutral-200 focus-ring"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={ARROW_PATH} />
          </svg>
        </Link>
      </div>
      <p className="mt-1 text-body-sm font-semibold text-neutral-500">
        사장님이 직접 올린 모집글로 스탭핑 내에서 지원이 가능해요!
      </p>
    </div>
  );

  return (
    <main className="min-h-screen bg-neutral-50">
      <RoleCoachmarkController role={viewerRole} />
      <AnalyticsEventTracker
        eventName={ANALYTICS_EVENTS.JOB_LIST_VIEW}
        properties={{ result_count: pagination.totalCount }}
      />
      <AppHeader isAuthenticated={Boolean(user)} />

      <section className="bg-neutral-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-5 text-center md:px-6 md:py-6">
          <div className="mx-auto max-w-xl">
            <h1 className="text-h2 text-neutral-900">
              제주 게스트하우스 스탭 모집
            </h1>
            <p className="mt-1.5 text-body-sm text-neutral-500">
              제주에서 머물며 일할 게스트하우스를 찾아보세요.
            </p>
          </div>
        </div>
      </section>

      <JobsFilterBar filters={filters} />

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 md:px-6 md:py-6">
        {jobs.length === 0 ? (
          <>
            {heading}
            <EmptyState
              className="mt-2"
              title="현재 조건에 맞는 모집 공고가 없습니다."
              description="필터를 조정하거나 나중에 다시 확인해주세요."
            />
          </>
        ) : (
          <JobsCarousel heading={heading}>
            {jobs.map((job, index) => (
              <div key={job.jobPost.id} className="min-w-0 snap-start">
                <JobCard
                  job={job}
                  coachmarkTarget={
                    index === 0 ? COACHMARK_TARGETS.staffJobCard : undefined
                  }
                />
              </div>
            ))}
            <div className="min-w-0 snap-start">
              <JobsMoreTile
                href={moreHref}
                thumbnails={jobs.map((job) => job.imageUrl)}
                ariaLabel="조건에 맞는 모집글 전체보기"
                caption="모든 모집글을 한 번에 확인해요"
              />
            </div>
          </JobsCarousel>
        )}
      </section>

      <CrawledJobsSection searchParams={resolvedSearchParams} />
    </main>
  );
}

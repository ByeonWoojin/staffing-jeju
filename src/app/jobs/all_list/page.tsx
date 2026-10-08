import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { CrawledJobCardView } from "@/components/jobs/CrawledJobsSection";
import { AppHeader } from "@/components/layout/AppHeader";
import { EmptyState } from "@/components/ui";
import { buildFilterQuery } from "@/lib/jobs/filter-query";
import { getCurrentAuthUser } from "@/lib/auth/onboarding";
import { getAllCrawledJobs, kstDate } from "@/lib/crawled-jobs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "전체보기",
  robots: { index: false, follow: true },
};

function dayLabel(day: string, today: string) {
  const [, month, date] = day.split("-").map(Number);
  const full = `${month}월 ${date}일`;
  const diff = Math.round((new Date(`${today}T00:00:00Z`).getTime() - new Date(`${day}T00:00:00Z`).getTime()) / 864e5);
  return diff === 0 ? `오늘 · ${full}` : diff === 1 ? `어제 · ${full}` : full;
}

export default async function AllListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, user] = await Promise.all([searchParams, getCurrentAuthUser()]);
  const bump = params.bump;
  const includeBumped = (Array.isArray(bump) ? bump[0] : bump) !== "off";
  const { jobs, available } = await getAllCrawledJobs(params, includeBumped);
  const today = kstDate(new Date());
  const toggleParams = new URLSearchParams(buildFilterQuery(params).slice(1));
  if (includeBumped) toggleParams.set("bump", "off");
  const bumpQuery = toggleParams.size ? `?${toggleParams}` : "";

  return (
    <main className="min-h-screen bg-neutral-50">
      <AppHeader isAuthenticated={Boolean(user)} />

      <section className="bg-neutral-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-5 text-center md:px-6 md:py-6">
          <div className="mx-auto max-w-xl">
            <h1 className="text-h2 text-neutral-900">전체보기</h1>
            <p className="mt-1.5 text-body-sm text-neutral-500">
              네이버 카페에 올라온 제주 게스트하우스 스탭 모집글을 최신순으로 모았어요.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 md:px-6 md:py-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/jobs" className="w-fit rounded-md text-body-sm font-semibold text-primary-700 hover:text-primary-600 focus-ring">
            모집글 목록으로
          </Link>
          {/* 끌올 포함 토글: 쿼리 bump=off 로 끈다(기본 켜짐), 걸려 있는 필터는 유지 */}
          <Link
            href={`/jobs/all_list${bumpQuery}`}
            scroll={false}
            role="switch"
            aria-checked={includeBumped}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-neutral-200 bg-neutral-0 px-3 text-caption font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-ring"
          >
            끌올 포함
            <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${includeBumped ? "bg-primary-600" : "bg-neutral-300"}`} aria-hidden="true">
              <span className={`size-4 rounded-full bg-neutral-0 transition-transform ${includeBumped ? "translate-x-4" : ""}`} />
            </span>
          </Link>
        </div>

        {!available || jobs.length === 0 ? (
          <EmptyState title="아직 모아둔 카페 모집글이 없습니다." description="나중에 다시 확인해주세요." />
        ) : (
          <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {jobs.map((job, index) => {
              // 처음 올라온 날짜(KST)가 바뀌는 지점에만 얇은 구분선을 넣는다 (최신순은 쿼리에서 이미 정렬됨)
              const day = kstDate(job.posted_at);
              const startsNewDay = index === 0 || day !== kstDate(jobs[index - 1].posted_at);
              return (
                <Fragment key={job.id}>
                  {startsNewDay && (
                    <div className="col-span-full flex items-center gap-3 pt-2 first:pt-0">
                      <span className="text-caption font-semibold text-neutral-500">{dayLabel(day, today)}</span>
                      <span className="h-px flex-1 bg-neutral-200" aria-hidden="true" />
                    </div>
                  )}
                  <CrawledJobCardView job={job} />
                </Fragment>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

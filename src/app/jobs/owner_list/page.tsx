import type { Metadata } from "next";
import Link from "next/link";
import { JobCard } from "@/components/jobs/JobCard";
import { JobsPagination } from "@/components/jobs/JobsPagination";
import { AppHeader } from "@/components/layout/AppHeader";
import { EmptyState } from "@/components/ui";
import { getCurrentAuthUser } from "@/lib/auth/onboarding";
import { getPublicJobs } from "@/lib/public-job-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "전체보기",
  alternates: { canonical: "/jobs" },
  robots: { index: false, follow: true },
};

// 사장님이 직접 올린 모집글 전체보기. 예전 /jobs 의 목록(20개씩 페이지 이동)이 여기로 옮겨왔다.
export default async function OwnerListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const [{ jobs, pagination }, user] = await Promise.all([getPublicJobs(resolvedSearchParams), getCurrentAuthUser()]);

  return (
    <main className="min-h-screen bg-neutral-50">
      <AppHeader isAuthenticated={Boolean(user)} />

      <section className="bg-neutral-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-5 text-center md:px-6 md:py-6">
          <div className="mx-auto max-w-xl">
            <h1 className="text-h2 text-neutral-900">전체보기</h1>
            <p className="mt-1.5 text-body-sm text-neutral-500">
              사장님이 직접 올린 모집글로 스탭핑 내에서 지원이 가능해요!
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 md:px-6 md:py-6">
        <Link href="/jobs" className="w-fit rounded-md text-body-sm font-semibold text-primary-700 hover:text-primary-600 focus-ring">
          모집글 목록으로
        </Link>

        {jobs.length === 0 ? (
          <EmptyState title="현재 조건에 맞는 모집 공고가 없습니다." description="필터를 조정하거나 나중에 다시 확인해주세요." />
        ) : (
          <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {jobs.map((job) => (
              <JobCard key={job.jobPost.id} job={job} />
            ))}
          </div>
        )}

        <JobsPagination pagination={pagination} searchParams={resolvedSearchParams} basePath="/jobs/owner_list" />
      </div>
    </main>
  );
}

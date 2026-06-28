import Image from "next/image";
import Link from "next/link";
import { getConditionSummary, getPublicJobs } from "@/lib/public-job-data";
import { formatDate } from "@/lib/owner-utils";
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

  return (
    <Card
      hoverable
      padding="none"
      className="group relative overflow-hidden border-transparent bg-transparent shadow-none"
    >
      <Link
        href={`/jobs/${jobPost.slug}`}
        className="absolute inset-0 z-10 rounded-lg focus-ring"
        aria-label={`${jobPost.title} 상세 보기`}
      />
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${guesthouse.name} 대표 이미지`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-body-sm text-neutral-400">
            등록된 사진이 없습니다
          </div>
        )}
        <div className="absolute right-3 top-3 z-20">
          <FavoriteGuesthouseButton
            guesthouseId={guesthouse.id}
            initialFavorited={isFavorited}
            presentation="icon"
            className="h-10 w-10 rounded-full bg-white/90 px-0 text-lg shadow-sm backdrop-blur hover:bg-white"
          />
        </div>
        {jobPost.is_urgent && (
          <div className="absolute left-3 top-3">
            <UrgentBadge />
          </div>
        )}
      </div>

      <div className="relative z-0 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-body-sm font-bold text-neutral-900">
              {guesthouse.name}
            </p>
            <p className="mt-0.5 truncate text-caption text-neutral-500">
              {guesthouse.region}
            </p>
          </div>
          <p className="shrink-0 text-caption font-semibold text-neutral-500">
            {formatDate(jobPost.work_start_date)}
          </p>
        </div>
        <h2 className="mt-2 line-clamp-2 min-h-[2.5rem] text-body-sm font-semibold text-neutral-800">
          {jobPost.title}
        </h2>
        <p className="mt-1 truncate text-caption text-neutral-500">
          최소 {jobPost.min_work_period} · {jobPost.recruit_count}명 모집
        </p>
        <div className="mt-3 flex gap-1.5 overflow-hidden">
          {getConditionSummary(jobPost)
            .slice(1, 5)
            .map((label) => (
              <Badge
                key={label}
                variant="default"
                className="max-w-[7.5rem] shrink-0 truncate bg-neutral-100 px-2"
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
  const { jobs, filters } = await getPublicJobs(await searchParams);

  return (
    <main className="min-h-screen bg-neutral-0">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 md:px-6 md:py-8">
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-caption font-semibold text-primary-700">
              스탭 구직자를 위한 공개 모집글
            </p>
            <h1 className="mt-1 text-h1 text-neutral-900">
              제주 게스트하우스 스탭 모집
            </h1>
            <p className="mt-2 max-w-2xl text-body-sm text-neutral-600">
              입도일, 위치, 숙소 제공 여부를 비교하고 마음에 드는 게스트하우스를 저장해보세요.
            </p>
          </div>
          <Link
            href="/staff/favorites"
            className="inline-flex text-body-sm font-semibold text-primary-700 md:pb-1"
          >
            관심 게스트하우스 보기
          </Link>
        </header>

        <JobsFilterBar filters={filters} />

        <div className="flex items-center justify-between">
          <p className="text-body-sm font-semibold text-neutral-800">
            조건에 맞는 모집글 {jobs.length}개
          </p>
        </div>

        {jobs.length === 0 ? (
          <EmptyState
            className="mt-2"
            title="현재 조건에 맞는 모집 공고가 없습니다."
            description="필터를 조정하거나 나중에 다시 확인해주세요."
          />
        ) : (
          <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {jobs.map((job) => (
              <JobCard key={job.jobPost.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

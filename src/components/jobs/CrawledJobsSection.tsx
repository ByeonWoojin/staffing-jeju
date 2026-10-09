import Image from "next/image";
import Link from "next/link";
import { JobsCarousel } from "@/components/jobs/JobsCarousel";
import { ARROW_PATH, JobsMoreTile } from "@/components/jobs/JobsMoreTile";
import { Badge, Card } from "@/components/ui";
import { getTodayCrawledJobs, isBumped, type CrawledJobCard } from "@/lib/crawled-jobs";
import { DEFAULT_GUESTHOUSE_IMAGE } from "@/lib/guesthouse-image";
import { buildFilterQuery, hasFilter } from "@/lib/jobs/filter-query";
import { formatDate } from "@/lib/owner-utils";

// 한 화면 8개(2줄 × 4열) + 옆으로 넘기면 15개 더 = 카드 23개, 마지막 칸은 전체보기 타일
const MAX_CARDS = 23;
type Chipped = Pick<CrawledJobCard, "provides_accommodation" | "provides_meal" | "stipend_type" | "party_kind">;

export function getCrawledChips(job: Chipped) {
  return [
    job.provides_accommodation ? "숙소 제공" : null,
    job.provides_meal ? "식사 제공" : null,
    job.stipend_type !== "none" ? "급여 있음" : null,
    job.party_kind === "party" ? "파티 있음" : null,
    job.party_kind === "potluck" ? "포틀럭" : null,
  ].filter((label): label is string => Boolean(label));
}

export function CrawledJobCardView({ job }: { job: CrawledJobCard }) {
  const conditions = [
    `입도일 ${formatDate(job.work_start_date)}`,
    `최소 ${job.min_work_period}`,
    job.work_days_per_week != null ? `주 ${job.work_days_per_week}일 근무` : null,
    job.off_days_per_week != null ? `주 ${job.off_days_per_week}일 휴무` : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <Card hoverable padding="md" className="group relative overflow-hidden">
      <Link
        href={`/jobs/crawled/${job.id}`}
        className="absolute inset-0 z-10 rounded-lg focus-ring"
        aria-label={`${job.title} 상세 보기`}
      />
      <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-beige">
        <Image
          src={job.thumbnail_url ?? DEFAULT_GUESTHOUSE_IMAGE}
          alt={job.guesthouse_name ? `${job.guesthouse_name} 게스트하우스` : "제주 게스트하우스"}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
        />
        {(job.is_urgent || isBumped(job)) && (
          <div className="absolute left-3 top-3 flex gap-1.5">
            {job.is_urgent && (
              <Badge variant="urgent" className="h-6 px-2 text-[12px]">
                급구
              </Badge>
            )}
            {isBumped(job) && (
              <Badge variant="sand" className="h-6 px-2 text-[12px]">
                끌올
              </Badge>
            )}
          </div>
        )}
      </div>
      <div className="relative z-0 pt-4 md:pt-5">
        <p className="truncate text-body-sm font-semibold text-neutral-500">
          {job.guesthouse_name ?? "게스트하우스"} · {job.region ?? "제주"}
        </p>
        <h3 className="mt-2 line-clamp-2 min-h-[2.75rem] text-[15px] font-semibold leading-[1.4] text-neutral-900 [word-break:keep-all] md:text-[16px]">
          {job.title}
        </h3>
        <div className="mt-3 flex flex-wrap gap-x-2.5 gap-y-1.5 text-caption font-medium text-neutral-500">
          {conditions.map((item) => (
            <span key={item} className="whitespace-nowrap">
              {item}
            </span>
          ))}
        </div>
        <div className="mt-3.5 flex min-h-6 flex-wrap gap-2">
          {getCrawledChips(job)
            .slice(0, 4)
            .map((label) => (
              <Badge
                key={label}
                variant="default"
                className="h-6 shrink-0 border border-neutral-200 bg-neutral-0 px-2.5 text-[11px] font-semibold text-neutral-600"
              >
                {label}
              </Badge>
            ))}
        </div>
      </div>
    </Card>
  );
}

// 최근 24시간 카페에 올라온(새 글 + 끌올) 모집글 섹션. 기존 /jobs 필터를 그대로 적용한다.
// 2줄 가로 스크롤 캐러셀이고, 마지막 칸이 전체보기 타일이다.
// 테이블이 없거나 최근 24시간 글이 하나도 없으면 렌더하지 않는다.
export async function CrawledJobsSection({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { jobs, todayTotal, todayNew, available } = await getTodayCrawledJobs(searchParams);
  if (!available || todayTotal === 0) return null;

  const filtered = hasFilter(searchParams);
  const moreHref = `/jobs/all_list${buildFilterQuery(searchParams)}`; // 걸려 있는 필터를 그대로 유지

  const heading = (
    <div>
      <div className="flex items-center gap-2">
        <h2 className="text-title text-neutral-900">최근 올라온 스탭 모집</h2>
        <Link
          href={moreHref}
          aria-label="최근 올라온 모집글 전체보기"
          className="inline-flex size-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition-colors hover:bg-neutral-200 focus-ring"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={ARROW_PATH} />
          </svg>
        </Link>
        <Badge variant="sand" className="h-6 px-2.5 text-[11px]">
          외부 모집글
        </Badge>
      </div>
      <p className="mt-1 text-body-sm font-semibold text-neutral-500">
        최근 24시간 카페에 올라온 모집글 {filtered ? `${jobs.length}건 (전체 ${todayTotal}건)` : `${todayTotal}건`} (새 글 {todayNew}건 · 끌올 {todayTotal - todayNew}건) · 지원은 각 모집글의 안내를 따라 직접 연락해요
      </p>
    </div>
  );

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-10 pt-5 md:px-6 md:pb-12 md:pt-6">
      {jobs.length === 0 ? (
        <>
          {heading}
          <p className="rounded-md border border-neutral-100 bg-neutral-0 px-4 py-6 text-center text-body-sm text-neutral-500">
            최근 24시간 올라온 카페 모집글 중 조건에 맞는 글이 없습니다.
          </p>
        </>
      ) : (
        <JobsCarousel heading={heading}>
          {jobs.slice(0, MAX_CARDS).map((job) => (
            <div key={job.id} className="min-w-0 snap-start">
              <CrawledJobCardView job={job} />
            </div>
          ))}
          <div className="min-w-0 snap-start">
            <JobsMoreTile href={moreHref} thumbnails={jobs.map((job) => job.thumbnail_url)} ariaLabel="최근 올라온 모집글 전체보기" caption="지난 모집글까지 한 번에 확인해요" />
          </div>
        </JobsCarousel>
      )}
    </section>
  );
}

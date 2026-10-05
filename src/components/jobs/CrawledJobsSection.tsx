import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { getTodayCrawledJobs, type CrawledJob } from "@/lib/crawled-jobs";
import { DEFAULT_GUESTHOUSE_IMAGE } from "@/lib/guesthouse-image";
import { formatDate } from "@/lib/owner-utils";

const MAX_CARDS = 24;

export function getCrawledChips(job: CrawledJob) {
  const f = job.fields;
  return [
    f.provides_accommodation ? "숙소 제공" : null,
    f.provides_meal ? "식사 제공" : null,
    f.stipend_type !== "none" ? "급여 있음" : null,
    job.party_kind === "party" ? "파티 있음" : null,
    job.party_kind === "potluck" ? "포틀럭" : null,
  ].filter((label): label is string => Boolean(label));
}

function CrawledJobCard({ job }: { job: CrawledJob }) {
  const f = job.fields;
  const conditions = [
    `입도일 ${formatDate(f.work_start_date)}`,
    `최소 ${f.min_work_period}`,
    f.work_days_per_week != null ? `주 ${f.work_days_per_week}일 근무` : null,
    f.off_days_per_week != null ? `주 ${f.off_days_per_week}일 휴무` : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <Card hoverable padding="md" className="group relative overflow-hidden">
      <Link
        href={`/jobs/crawled/${job.id}`}
        className="absolute inset-0 z-10 rounded-lg focus-ring"
        aria-label={`${job.title} 상세 보기`}
      />
      <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-beige">
        {/* 네이버 CDN 이미지: 로컬 확인용. 등록 시에는 우리 버킷에 재업로드 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={job.thumbnail ?? DEFAULT_GUESTHOUSE_IMAGE}
          alt={job.guesthouse.name ? `${job.guesthouse.name} 게스트하우스` : "제주 게스트하우스"}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        {f.is_urgent && (
          <div className="absolute left-3 top-3">
            <Badge variant="urgent" className="h-6 px-2 text-[12px]">
              급구
            </Badge>
          </div>
        )}
      </div>
      <div className="relative z-0 pt-4 md:pt-5">
        <p className="truncate text-body-sm font-semibold text-neutral-500">
          {job.guesthouse.name ?? "게스트하우스"} · {job.guesthouse.region ?? "제주"}
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
        {/* 로컬 검수용: 사장님이 직접 판정해야 하는 누락 필드 */}
        {job.missing.length > 0 && (
          <p className="mt-3 text-[11px] font-medium text-neutral-400">
            확인 필요: {job.missing.join(", ")}
          </p>
        )}
      </div>
    </Card>
  );
}

// 카페 수집 공고 섹션. 기존 /jobs 필터를 그대로 적용한다. 수집 파일이 없으면(프로덕션 포함) 렌더하지 않는다.
export function CrawledJobsSection({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const jobs = getTodayCrawledJobs(searchParams);
  if (process.env.NODE_ENV === "production") return null;
  const todayLabel = new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" });

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-5 md:px-6 md:pt-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-title text-neutral-900">오늘 올라온 스탭 모집</h2>
            <Badge variant="sand" className="h-6 px-2.5 text-[11px]">
              외부 모집글
            </Badge>
          </div>
          <p className="mt-1 text-body-sm font-semibold text-neutral-500">
            오늘({todayLabel}) 카페에 새로 올라온 모집글 {jobs.length}건 · 지원은 각 모집글의 안내를 따라 직접 연락해요
          </p>
        </div>
      </div>
      {jobs.length === 0 ? (
        <p className="rounded-md border border-neutral-100 bg-neutral-0 px-4 py-6 text-center text-body-sm text-neutral-500">
          오늘 새로 올라온 카페 모집글 중 조건에 맞는 글이 없습니다.
        </p>
      ) : (
        <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {jobs.slice(0, MAX_CARDS).map((job) => (
            <CrawledJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </section>
  );
}

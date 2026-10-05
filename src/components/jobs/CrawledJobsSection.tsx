import Image from "next/image";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { getTodayCrawledJobs, type CrawledJobCard } from "@/lib/crawled-jobs";
import { DEFAULT_GUESTHOUSE_IMAGE } from "@/lib/guesthouse-image";
import { formatDate } from "@/lib/owner-utils";

const FILTER_KEYS = ["region", "gender", "party", "paid", "accommodation", "meal", "urgent", "q", "arrivalStart", "arrivalEnd"];

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

function CrawledJobCardView({ job }: { job: CrawledJobCard }) {
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
        {job.is_urgent && (
          <div className="absolute left-3 top-3">
            <Badge variant="urgent" className="h-6 px-2 text-[12px]">
              급구
            </Badge>
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

// 오늘 카페에 새로 올라온 모집글 섹션. 기존 /jobs 필터를 그대로 적용한다.
// 테이블이 없거나 오늘 새 글이 하나도 없으면 렌더하지 않는다.
export async function CrawledJobsSection({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { jobs, todayTotal, available } = await getTodayCrawledJobs(searchParams);
  if (!available || todayTotal === 0) return null;

  const filtered = FILTER_KEYS.some((key) => Boolean(searchParams[key]));
  const todayLabel = new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" });

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-5 md:px-6 md:pt-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-title text-neutral-900">오늘 올라온 스탭 모집</h2>
          <Badge variant="sand" className="h-6 px-2.5 text-[11px]">
            외부 모집글
          </Badge>
        </div>
        <p className="mt-1 text-body-sm font-semibold text-neutral-500">
          오늘({todayLabel}) 카페에 새로 올라온 모집글 {filtered ? `${jobs.length}건 (전체 ${todayTotal}건)` : `${todayTotal}건`} · 지원은 각 모집글의 안내를 따라 직접 연락해요
        </p>
      </div>
      {jobs.length === 0 ? (
        <p className="rounded-md border border-neutral-100 bg-neutral-0 px-4 py-6 text-center text-body-sm text-neutral-500">
          오늘 새로 올라온 카페 모집글 중 조건에 맞는 글이 없습니다.
        </p>
      ) : (
        <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {jobs.map((job) => (
            <CrawledJobCardView key={job.id} job={job} />
          ))}
        </div>
      )}
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";
import { FavoriteGuesthouseButton } from "@/components/jobs/FavoriteGuesthouseButton";
import { Badge, Card, UrgentBadge } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  getGuesthouseImageAlt,
  getGuesthouseImageSource,
} from "@/lib/guesthouse-image";
import { formatDate } from "@/lib/owner-utils";
import type { getPublicJobs } from "@/lib/public-job-data";

export function JobCard({
  job,
  coachmarkTarget,
}: {
  job: Awaited<ReturnType<typeof getPublicJobs>>["jobs"][number];
  coachmarkTarget?: string;
}) {
  const { jobPost, guesthouse, imageUrl, isFavorited } = job;
  const isClosed = jobPost.status === "closed";
  const positiveChips = [
    jobPost.provides_accommodation ? "숙소 제공" : null,
    jobPost.provides_meal ? "식사 제공" : null,
    jobPost.stipend_type !== "none" ? "급여 있음" : null,
    jobPost.has_party ? "파티 있음" : null,
  ].filter((label): label is string => Boolean(label));
  const conditionItems = [
    `입도일 ${formatDate(jobPost.work_start_date)}`,
    `최소 ${jobPost.min_work_period}`,
    `주 ${jobPost.work_days_per_week}일 근무`,
    `주 ${jobPost.off_days_per_week}일 휴무`,
  ];
  const cardImageSrc = getGuesthouseImageSource(imageUrl);
  const cardImageAlt = getGuesthouseImageAlt(guesthouse.name, imageUrl);

  return (
    <Card
      hoverable
      padding="md"
      className="group relative overflow-hidden"
      data-coachmark={coachmarkTarget}
    >
      <Link
        href={`/jobs/${jobPost.slug}`}
        className="absolute inset-0 z-10 rounded-lg focus-ring"
        aria-label={`${jobPost.title} 상세 보기`}
      />
      <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-beige">
        <Image
          src={cardImageSrc}
          alt={cardImageAlt}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
        />
        {isClosed && <div className="absolute inset-0 bg-neutral-900/35" />}
        <div className="absolute right-3 top-3 z-20">
          <FavoriteGuesthouseButton
            guesthouseId={guesthouse.id}
            jobPostId={jobPost.id}
            sourcePage="job_list"
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
          "relative z-0 pt-4 transition-colors md:pt-5",
          isClosed && "opacity-70",
        )}
      >
        <p className="truncate text-body-sm font-semibold text-neutral-500">
          {guesthouse.name} · {guesthouse.region}
        </p>
        <h2 className="mt-2 line-clamp-2 min-h-[2.75rem] text-[15px] font-semibold leading-[1.4] text-neutral-900 [word-break:keep-all] md:text-[16px]">
          {jobPost.title}
        </h2>
        <div className="mt-3 flex flex-wrap gap-x-2.5 gap-y-1.5 text-caption font-medium text-neutral-500">
          {conditionItems.map((item) => (
            <span key={item} className="whitespace-nowrap">
              {item}
            </span>
          ))}
        </div>
        <div className="mt-3.5 flex min-h-6 flex-wrap gap-2 overflow-visible">
          {positiveChips.slice(0, 3).map((label) => (
            <Badge
              key={label}
              variant="default"
              className="h-6 max-w-full shrink-0 truncate border border-neutral-200 bg-neutral-0 px-2.5 text-[11px] font-semibold text-neutral-600"
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}

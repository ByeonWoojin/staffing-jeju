import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPublicJobBySlug,
  getStipendSummary,
} from "@/lib/public-job-data";
import { getGenderConditionLabel } from "@/lib/labels";
import { formatDate } from "@/lib/owner-utils";
import { ApplyButton } from "@/components/jobs/ApplyButton";
import { FavoriteGuesthouseButton } from "@/components/jobs/FavoriteGuesthouseButton";
import { Badge, Button, Card, EmptyState, UrgentBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

function PhotoGrid({
  photos,
  emptyText,
}: {
  photos: { id: string; url: string; altText: string }[];
  emptyText: string;
}) {
  if (photos.length === 0) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-md bg-beige px-4 text-center text-body-sm font-semibold text-brown">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {photos.map((photo) => (
        <div key={photo.id} className="relative aspect-[4/3] overflow-hidden rounded-md bg-beige">
          <Image src={photo.url} alt={photo.altText} fill className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" />
        </div>
      ))}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-neutral-100 py-3 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-body-sm font-semibold text-neutral-500">{label}</dt>
      <dd className="text-body-sm text-neutral-800 whitespace-pre-wrap">{value || "—"}</dd>
    </div>
  );
}

function getPositiveBadges(
  jobPost: NonNullable<
    Awaited<ReturnType<typeof getPublicJobBySlug>>["detail"]
  >["jobPost"],
) {
  return [
    jobPost.provides_accommodation ? "숙소 제공" : null,
    jobPost.provides_meal ? "식사 제공" : null,
    jobPost.stipend_type !== "none" ? "급여 있음" : null,
    jobPost.has_party ? "파티 있음" : null,
  ].filter((label): label is string => Boolean(label));
}

export default async function PublicJobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slug) notFound();

  const { detail } = await getPublicJobBySlug(slug);

  if (!detail) {
    return (
      <main className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
          <EmptyState
            title="모집이 종료되었거나 존재하지 않는 공고입니다."
            description="현재 공개 중인 모집글 목록에서 다른 공고를 확인해주세요."
            action={
              <Link
                href="/jobs"
                className="inline-flex h-11 items-center rounded-md bg-primary-500 px-5 text-body-sm font-semibold text-white hover:bg-primary-600"
              >
                모집글 목록 보기
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  const { jobPost, guesthouse } = detail;
  const isClosed = jobPost.status === "closed";
  const positiveBadges = getPositiveBadges(jobPost);

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
        <Link href="/jobs" className="text-body-sm font-semibold text-primary-700">
          모집글 목록으로
        </Link>

        <Card padding="none" className="overflow-hidden shadow-sm">
          <div className="flex flex-col gap-5 p-4 md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-neutral-500">
                  {guesthouse.name} · {guesthouse.region}
                </p>
                <h1 className="mt-2 text-h2 text-neutral-900 md:text-h1">
                  {jobPost.title}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {isClosed && (
                    <Badge className="h-6 border border-neutral-200 bg-neutral-800 px-2 text-[12px] font-bold text-white">
                      모집 마감
                    </Badge>
                  )}
                  {jobPost.is_urgent && <UrgentBadge />}
                  {positiveBadges.map((label) => (
                    <Badge
                      key={label}
                      className="h-6 border border-neutral-200 bg-neutral-0 px-2 text-[12px] text-neutral-600"
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:w-72">
                <FavoriteGuesthouseButton
                  guesthouseId={guesthouse.id}
                  initialFavorited={detail.isFavorited}
                  fullWidth
                />
                {isClosed ? (
                  <div className="flex flex-col gap-2">
                    <Button size="lg" fullWidth disabled>
                      모집 마감
                    </Button>
                    <p className="text-caption font-semibold text-neutral-500">
                      이미 마감된 공고입니다.
                    </p>
                  </div>
                ) : (
                  <ApplyButton slug={jobPost.slug} />
                )}
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-beige sm:aspect-[16/9]">
              {detail.imageUrl ? (
                <Image
                  src={detail.imageUrl}
                  alt={`${guesthouse.name} 대표 이미지`}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 960px, 100vw"
                  priority
                />
              ) : (
                <div className="flex h-full min-h-72 items-center justify-center px-4 text-center text-body-sm font-semibold text-brown">
                  등록된 사진이 없습니다
                </div>
              )}
            </div>

            <dl className="grid gap-2 rounded-md border border-neutral-100 bg-beige p-4 text-body-sm sm:grid-cols-3">
              <div>
                <dt className="text-caption font-semibold text-neutral-500">입도일</dt>
                <dd className="mt-1 font-bold text-neutral-900">
                  {formatDate(jobPost.work_start_date)}
                </dd>
              </div>
              <div>
                <dt className="text-caption font-semibold text-neutral-500">
                  최소 근무 기간
                </dt>
                <dd className="mt-1 font-bold text-neutral-900">
                  {jobPost.min_work_period}
                </dd>
              </div>
              <div>
                <dt className="text-caption font-semibold text-neutral-500">근무/휴무</dt>
                <dd className="mt-1 font-bold text-neutral-900">
                  주 {jobPost.work_days_per_week}일 · 휴무 {jobPost.off_days_per_week}일
                </dd>
              </div>
            </dl>
            <p className="text-caption text-neutral-500">
              {isClosed ? "모집 마감된 공고입니다." : "지원하려면 로그인이 필요합니다."}
            </p>
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-h3 text-neutral-900">게스트하우스 정보</h2>
                <p className="mt-1 text-body-sm text-neutral-500">
                  마음에 드는 게스트하우스는 관심 목록에 저장할 수 있습니다.
                </p>
              </div>
            </div>
            <PhotoGrid photos={detail.guesthousePhotos} emptyText="등록된 게스트하우스 사진이 없습니다" />
            <dl>
              <InfoRow label="이름" value={guesthouse.name} />
              <InfoRow label="지역" value={guesthouse.region} />
              <InfoRow label="주소" value={guesthouse.address_text} />
              <InfoRow label="설명" value={guesthouse.description ?? ""} />
              <InfoRow label="연락 수단" value={guesthouse.contact_method} />
            </dl>
            <p className="text-caption text-neutral-500">
              정확한 지원 관리는 스탭핑 지원서를 통해 진행됩니다.
            </p>
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="text-h3 text-neutral-900">모집글 정보</h2>
            <PhotoGrid photos={detail.jobPostPhotos} emptyText="등록된 모집글 사진이 없습니다" />
            <dl>
              <InfoRow label="모집 인원" value={`${jobPost.recruit_count}명`} />
              <InfoRow label="성별 조건" value={getGenderConditionLabel(jobPost.gender_condition)} />
              <InfoRow label="입도일" value={formatDate(jobPost.work_start_date)} />
              <InfoRow label="최소 근무 기간" value={jobPost.min_work_period} />
              <InfoRow label="업무 내용" value={jobPost.work_content} />
              <InfoRow label="파티 운영" value={jobPost.has_party ? "파티 있음" : "파티 없음"} />
              {jobPost.has_party && (
                <InfoRow label="파티 안내" value={jobPost.party_description ?? ""} />
              )}
              <InfoRow label="근무 시간" value={jobPost.work_time} />
              <InfoRow
                label="근무/휴무"
                value={`주 ${jobPost.work_days_per_week}일 근무 · 주 ${jobPost.off_days_per_week}일 휴무`}
              />
              <InfoRow label="급여/보상" value={getStipendSummary(jobPost)} />
              <InfoRow label="숙소 제공" value={jobPost.provides_accommodation ? "제공" : "미제공"} />
              <InfoRow label="식사 제공" value={jobPost.provides_meal ? "제공" : "미제공"} />
              <InfoRow label="우대 조건" value={jobPost.preferred_conditions ?? ""} />
              <InfoRow label="주의사항" value={jobPost.caution ?? ""} />
              <InfoRow label="추가 안내" value={jobPost.extra_info ?? ""} />
              <InfoRow label="상세 설명" value={jobPost.description ?? ""} />
            </dl>
          </Card>
        </div>
      </div>
    </main>
  );
}

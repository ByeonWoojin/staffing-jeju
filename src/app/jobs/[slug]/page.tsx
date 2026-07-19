import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode } from "react";
import { notFound } from "next/navigation";
import { getPublicJobPostBySlug } from "@/lib/jobs/get-public-job-post";
import { getStipendSummary } from "@/lib/public-job-data";
import { buildJobPostMetadata } from "@/lib/seo/job-post-metadata";
import { AnalyticsEventTracker } from "@/components/analytics/AnalyticsEventTracker";
import { getGenderConditionLabel } from "@/lib/labels";
import { formatDate } from "@/lib/owner-utils";
import { ApplyButton } from "@/components/jobs/ApplyButton";
import { FavoriteGuesthouseButton } from "@/components/jobs/FavoriteGuesthouseButton";
import { JobImageSlider } from "@/components/jobs/JobImageSlider";
import { JobDetailSectionNav } from "@/components/jobs/JobDetailSectionNav";
import { AppHeader } from "@/components/layout/AppHeader";
import { RoleCoachmarkController } from "@/components/onboarding/RoleCoachmarkController";
import {
  ApplicationStatusBadge,
  Badge,
  Button,
  ButtonLink,
  Card,
  JobStatusBadge,
  UrgentBadge,
} from "@/components/ui";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { COACHMARK_TARGETS } from "@/lib/onboarding/coachmark-config";

export const dynamic = "force-dynamic";

type JobDetail = NonNullable<
  Awaited<ReturnType<typeof getPublicJobPostBySlug>>["detail"]
>;
type JobPost = JobDetail["jobPost"];
type Guesthouse = JobDetail["guesthouse"];
type DetailPhoto = JobDetail["jobPostPhotos"][number];

interface DetailItem {
  label: string;
  value: ReactNode;
}

interface TextBlock {
  title: string;
  value: string;
}

type JobPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: JobPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { detail } = await getPublicJobPostBySlug(slug);

  if (!detail) {
    return {
      title: "모집글을 찾을 수 없습니다",
      description: "요청한 제주 게스트하우스 스탭 모집글을 찾을 수 없습니다.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const generated = buildJobPostMetadata(detail);

  return {
    title: generated.title,
    description: generated.description,
    alternates: {
      canonical: `/jobs/${detail.jobPost.slug}`,
    },
    openGraph: {
      title: generated.ogTitle,
      description: generated.ogDescription,
      url: `/jobs/${detail.jobPost.slug}`,
      siteName: "스탭핑",
      locale: "ko_KR",
      type: "website",
      images: [
        {
          url: generated.imageUrl ?? "/images/og/staffing-og.png",
          alt: generated.imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: generated.ogTitle,
      description: generated.ogDescription,
      images: [generated.imageUrl ?? "/images/og/staffing-og.png"],
    },
    robots: generated.robots,
  };
}

function normalizeText(value: string | null | undefined) {
  const text = value?.trim();
  return text ? text : null;
}

function isDetailItem(item: DetailItem | null): item is DetailItem {
  return item !== null;
}

function isTextBlock(block: TextBlock | null): block is TextBlock {
  return block !== null;
}

function createTextItem(
  label: string,
  value: string | null | undefined,
): DetailItem | null {
  const text = normalizeText(value);
  return text ? { label, value: text } : null;
}

function createTextBlock(
  title: string,
  value: string | null | undefined,
): TextBlock | null {
  const text = normalizeText(value);
  return text ? { title, value: text } : null;
}

function getPositiveBadges(jobPost: JobPost) {
  return [
    jobPost.provides_accommodation ? "숙소 제공" : null,
    jobPost.provides_meal ? "식사 제공" : null,
    jobPost.stipend_type !== "none" ? "급여 있음" : null,
    jobPost.has_party ? "파티 있음" : null,
  ].filter((label): label is string => Boolean(label));
}

function getWorkDaysSummary(jobPost: JobPost) {
  return `주 ${jobPost.work_days_per_week}일 근무 · 주 ${jobPost.off_days_per_week}일 휴무`;
}

function getStayMealSummary(jobPost: JobPost) {
  return [
    jobPost.provides_accommodation ? "숙소 제공" : "숙소 미제공",
    jobPost.provides_meal ? "식사 제공" : "식사 미제공",
  ].join(" · ");
}

function createSummaryItems(jobPost: JobPost): DetailItem[] {
  return [
    { label: "입도일", value: formatDate(jobPost.work_start_date) },
    { label: "근무 기간", value: jobPost.min_work_period },
    { label: "근무/휴무", value: getWorkDaysSummary(jobPost) },
    { label: "모집 인원", value: `${jobPost.recruit_count}명` },
    { label: "숙식", value: getStayMealSummary(jobPost) },
    { label: "급여/보상", value: getStipendSummary(jobPost) },
  ];
}

function createStickyItems(jobPost: JobPost): DetailItem[] {
  return [
    { label: "입도일", value: formatDate(jobPost.work_start_date) },
    { label: "근무 기간", value: jobPost.min_work_period },
    { label: "근무/휴무", value: getWorkDaysSummary(jobPost) },
    { label: "모집 인원", value: `${jobPost.recruit_count}명` },
    { label: "숙식", value: getStayMealSummary(jobPost) },
  ];
}

function createRecruitmentItems(jobPost: JobPost): DetailItem[] {
  const items: Array<DetailItem | null> = [
    { label: "성별 조건", value: getGenderConditionLabel(jobPost.gender_condition) },
    createTextItem("연령 조건", jobPost.age_condition),
    { label: "근무 시간", value: jobPost.work_time },
    { label: "파티 운영", value: jobPost.has_party ? "운영함" : "운영 안 함" },
  ];

  return items.filter(isDetailItem);
}

function createRecruitmentTextBlocks(jobPost: JobPost): TextBlock[] {
  const blocks: Array<TextBlock | null> = [
    createTextBlock("업무 내용", jobPost.work_content),
    jobPost.has_party
      ? createTextBlock("파티 안내", jobPost.party_description)
      : null,
    createTextBlock("우대 조건", jobPost.preferred_conditions),
    createTextBlock("상세 설명", jobPost.description),
  ];

  return blocks.filter(isTextBlock);
}

function createGuesthouseItems(guesthouse: Guesthouse): DetailItem[] {
  return [
    createTextItem("연락 수단", guesthouse.contact_method),
  ].filter(isDetailItem);
}

function createGuideItems(guesthouse: Guesthouse): DetailItem[] {
  const items = [
    createTextItem("주소", guesthouse.address_text),
    !normalizeText(guesthouse.address_text)
      ? createTextItem("지역", guesthouse.region)
      : null,
  ].filter(isDetailItem);

  const mapUrl = normalizeText(guesthouse.map_url);
  if (mapUrl) {
    items.push({
      label: "지도 링크",
      value: (
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-primary-700 hover:text-primary-600 focus-ring rounded-md"
        >
          새 창에서 열기
        </a>
      ),
    });
  }

  return items;
}

function createGuideTextBlocks(jobPost: JobPost): TextBlock[] {
  return [
    createTextBlock("주의사항", jobPost.caution),
    createTextBlock("추가 안내", jobPost.extra_info),
  ].filter(isTextBlock);
}

function DetailPhotoGallery({ photos }: { photos: DetailPhoto[] }) {
  if (photos.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          className={`relative aspect-[4/3] overflow-hidden rounded-md bg-neutral-100 ${
            index === 0 && photos.length >= 3 ? "md:col-span-2" : ""
          }`}
        >
          <Image
            src={photo.url}
            alt={photo.altText}
            fill
            className="object-cover"
            sizes={
              index === 0 && photos.length >= 3
                ? "(min-width: 768px) 720px, 100vw"
                : "(min-width: 768px) 340px, 100vw"
            }
          />
        </div>
      ))}
    </div>
  );
}

function SummaryGrid({ items }: { items: DetailItem[] }) {
  return (
    <Card padding="sm">
      <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-caption font-semibold text-neutral-500">
              {item.label}
            </dt>
            <dd className="mt-1 break-words text-body-sm font-bold text-neutral-900">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function DefinitionGrid({ items }: { items: DetailItem[] }) {
  if (items.length === 0) return null;

  return (
    <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-caption font-semibold text-neutral-500">
            {item.label}
          </dt>
          <dd className="mt-1 break-words text-body-sm font-semibold text-neutral-800">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function TextBlockList({
  blocks,
  withDivider = false,
}: {
  blocks: TextBlock[];
  withDivider?: boolean;
}) {
  if (blocks.length === 0) return null;

  return (
    <div
      className={
        withDivider
          ? "divide-y divide-neutral-200 border-t border-neutral-200"
          : "divide-y divide-neutral-200"
      }
    >
      {blocks.map((block) => (
        <section
          key={block.title}
          className={
            withDivider
              ? "py-5 first:pt-5 last:pb-0"
              : "py-5 first:pt-0 last:pb-0"
          }
        >
          <h3 className="text-body font-bold text-neutral-900">
            {block.title}
          </h3>
          <p className="mt-3 whitespace-pre-wrap break-words text-body-sm leading-relaxed text-neutral-600">
            {block.value}
          </p>
        </section>
      ))}
    </div>
  );
}

function DetailSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <Card className="flex flex-col gap-5">
        <div>
          <h2 className="text-h3 text-neutral-900">{title}</h2>
          {description && (
            <p className="mt-1 text-body-sm text-neutral-500">{description}</p>
          )}
        </div>
        {children}
      </Card>
    </section>
  );
}

function SupportAction({
  detail,
  isClosed,
  coachmarkTarget,
}: {
  detail: JobDetail;
  isClosed: boolean;
  coachmarkTarget?: string;
}) {
  const activeApplication =
    detail.viewerApplication && detail.viewerApplication.status !== "canceled"
      ? detail.viewerApplication
      : null;

  if (activeApplication) {
    return (
      <div className="grid gap-3">
        <div className="rounded-md border border-neutral-100 bg-neutral-50 p-3">
          <p className="mb-2 text-caption font-semibold text-neutral-500">
            내 지원 상태
          </p>
          <ApplicationStatusBadge status={activeApplication.status} />
        </div>
        <ButtonLink href="/staff/applications" variant="outline" fullWidth>
          내 지원 현황 보기
        </ButtonLink>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="grid gap-2">
        <Button size="lg" fullWidth disabled>
          지원 마감
        </Button>
        <p className="text-caption font-semibold text-neutral-500">
          모집이 마감되어 새 지원을 받을 수 없습니다.
        </p>
      </div>
    );
  }

  return (
    <ApplyButton slug={detail.jobPost.slug} coachmarkTarget={coachmarkTarget} />
  );
}

function SupportCard({
  detail,
  stickyItems,
  isClosed,
  isAuthenticated,
  coachmarkTarget,
}: {
  detail: JobDetail;
  stickyItems: DetailItem[];
  isClosed: boolean;
  isAuthenticated: boolean;
  coachmarkTarget?: string;
}) {
  const { jobPost, guesthouse } = detail;
  const activeApplication =
    detail.viewerApplication && detail.viewerApplication.status !== "canceled"
      ? detail.viewerApplication
      : null;
  const canceledApplication = detail.viewerApplication?.status === "canceled";
  const supportMessage = isClosed
    ? "마감된 공고입니다."
    : activeApplication
      ? "이미 지원한 공고입니다."
      : isAuthenticated
        ? "지원서를 작성하고 사장님에게 내 정보를 전달해보세요."
        : "지원하려면 로그인이 필요합니다.";

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <JobStatusBadge status={jobPost.status} />
          {jobPost.is_urgent && <UrgentBadge />}
          {canceledApplication && <ApplicationStatusBadge status="canceled" />}
        </div>
        <FavoriteGuesthouseButton
          guesthouseId={guesthouse.id}
          jobPostId={jobPost.id}
          sourcePage="job_detail"
          initialFavorited={detail.isFavorited}
          presentation="icon"
          className="size-10 shrink-0 rounded-full px-0 text-lg"
        />
      </div>

      <div>
        <p className="text-caption font-semibold text-neutral-500">
          {guesthouse.region}
        </p>
        <h2 className="mt-1 line-clamp-2 text-title text-neutral-900">
          {guesthouse.name}
        </h2>
        <p className="mt-2 text-body-sm text-neutral-600">{supportMessage}</p>
      </div>

      <dl className="grid gap-3 border-y border-neutral-100 py-4">
        {stickyItems.map((item) => (
          <div key={item.label} className="flex items-start justify-between gap-3">
            <dt className="shrink-0 text-caption font-semibold text-neutral-500">
              {item.label}
            </dt>
            <dd className="text-right text-body-sm font-semibold text-neutral-800">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-2">
        <SupportAction
          detail={detail}
          isClosed={isClosed}
          coachmarkTarget={coachmarkTarget}
        />
      </div>
    </Card>
  );
}

function MobileApplyBar({
  detail,
  isClosed,
  coachmarkTarget,
}: {
  detail: JobDetail;
  isClosed: boolean;
  coachmarkTarget?: string;
}) {
  const activeApplication =
    detail.viewerApplication && detail.viewerApplication.status !== "canceled"
      ? detail.viewerApplication
      : null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-100 bg-neutral-0/95 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-md backdrop-blur lg:hidden">
      <div className="page-container">
        {activeApplication ? (
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-caption font-semibold text-neutral-500">
                내 지원 상태
              </p>
              <ApplicationStatusBadge status={activeApplication.status} />
            </div>
            <ButtonLink href="/staff/applications" variant="outline" fullWidth>
              내 지원 현황 보기
            </ButtonLink>
          </div>
        ) : isClosed ? (
          <Button size="lg" fullWidth disabled>
            지원 마감
          </Button>
        ) : (
          <ApplyButton
            slug={detail.jobPost.slug}
            coachmarkTarget={coachmarkTarget}
          />
        )}
      </div>
    </div>
  );
}

export default async function PublicJobDetailPage({
  params,
}: JobPageProps) {
  const { slug } = await params;
  if (!slug) notFound();

  const { detail, viewerProfile } = await getPublicJobPostBySlug(slug);
  const isAuthenticated = Boolean(viewerProfile);

  if (!detail) {
    notFound();
  }

  const { jobPost, guesthouse } = detail;
  const isClosed = jobPost.status === "closed";
  const activeApplication =
    detail.viewerApplication && detail.viewerApplication.status !== "canceled"
      ? detail.viewerApplication
      : null;
  const canShowStaffApplyCoachmark =
    viewerProfile?.role === "staff" && !isClosed && !activeApplication;
  const staffApplyCoachmarkTarget = canShowStaffApplyCoachmark
    ? COACHMARK_TARGETS.staffApply
    : undefined;
  const positiveBadges = getPositiveBadges(jobPost);
  const guesthousePhotos = detail.guesthousePhotos;
  const jobPostPhotos = detail.jobPostPhotos;
  const heroPhotos =
    guesthousePhotos.length > 0 ? guesthousePhotos : jobPostPhotos;
  const summaryItems = createSummaryItems(jobPost);
  const stickyItems = createStickyItems(jobPost);
  const recruitmentItems = createRecruitmentItems(jobPost);
  const recruitmentTextBlocks = createRecruitmentTextBlocks(jobPost);
  const guesthouseDescription = normalizeText(guesthouse.description);
  const guesthouseItems = createGuesthouseItems(guesthouse);
  const guideItems = createGuideItems(guesthouse);
  const guideTextBlocks = createGuideTextBlocks(jobPost);

  const hasRecruitmentSection =
    recruitmentItems.length > 0 ||
    recruitmentTextBlocks.length > 0 ||
    jobPostPhotos.length > 0;
  const hasGuesthouseSection =
    Boolean(guesthouseDescription) || guesthouseItems.length > 0;
  const hasGuideSection = guideItems.length > 0 || guideTextBlocks.length > 0;

  return (
    <main className="min-h-screen bg-neutral-50">
      <RoleCoachmarkController
        role={canShowStaffApplyCoachmark ? "staff" : null}
      />
      <AnalyticsEventTracker
        eventName={ANALYTICS_EVENTS.JOB_DETAIL_VIEW}
        properties={{
          job_post_id: jobPost.id,
          guesthouse_id: guesthouse.id,
          region: guesthouse.region,
          job_status: jobPost.status,
        }}
      />
      <AppHeader isAuthenticated={isAuthenticated} />

      <div className="page-container flex flex-col gap-6 py-6 pb-32 md:py-8 lg:pb-10">
        <Link
          href="/jobs"
          className="w-fit text-body-sm font-semibold text-primary-700 hover:text-primary-600 focus-ring rounded-md"
        >
          모집글 목록으로
        </Link>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-6">
            <section className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-body-sm font-semibold text-neutral-500">
                    {guesthouse.name} · {guesthouse.region}
                  </p>
                  <h1 className="mt-2 break-words text-h2 text-neutral-900 md:text-h1">
                    {jobPost.title}
                  </h1>
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <JobStatusBadge status={jobPost.status} />
                      {jobPost.is_urgent && <UrgentBadge />}
                      {positiveBadges.map((label) => (
                        <Badge key={label}>{label}</Badge>
                      ))}
                    </div>
                    <FavoriteGuesthouseButton
                      guesthouseId={guesthouse.id}
                      jobPostId={jobPost.id}
                      sourcePage="job_detail"
                      initialFavorited={detail.isFavorited}
                      presentation="icon"
                      className="size-10 shrink-0 rounded-full px-0 text-lg lg:hidden"
                    />
                  </div>
                </div>
              </div>
            </section>

            <JobImageSlider
              images={heroPhotos}
              fallbackAlt={`${guesthouse.name} 대표 이미지`}
            />

            <SummaryGrid items={summaryItems} />

            <JobDetailSectionNav
              sections={[
                {
                  id: "recruitment",
                  label: "모집 정보",
                  visible: hasRecruitmentSection,
                },
                {
                  id: "guesthouse",
                  label: "게스트하우스",
                  visible: hasGuesthouseSection,
                },
                {
                  id: "guide",
                  label: "위치 및 안내",
                  visible: hasGuideSection,
                },
              ]}
            />

            <div className="flex flex-col gap-6">
              {hasRecruitmentSection && (
                <DetailSection
                  id="recruitment"
                  title="모집 정보"
                  description="근무 방식과 상세 안내를 확인하세요."
                >
                  <DefinitionGrid items={recruitmentItems} />
                  <TextBlockList
                    blocks={recruitmentTextBlocks}
                    withDivider={recruitmentItems.length > 0}
                  />
                  <DetailPhotoGallery photos={jobPostPhotos} />
                </DetailSection>
              )}

              {hasGuesthouseSection && (
                <DetailSection
                  id="guesthouse"
                  title="게스트하우스 소개"
                  description="지원 후 머물고 일하게 될 공간입니다."
                >
                  {guesthouseDescription && (
                    <p className="whitespace-pre-wrap text-body-sm leading-relaxed text-neutral-700">
                      {guesthouseDescription}
                    </p>
                  )}
                  <DefinitionGrid items={guesthouseItems} />
                </DetailSection>
              )}

              {hasGuideSection && (
                <DetailSection
                  id="guide"
                  title="위치 및 안내"
                  description="방문 전 확인할 위치와 추가 안내입니다."
                >
                  <DefinitionGrid items={guideItems} />
                  <TextBlockList
                    blocks={guideTextBlocks}
                    withDivider={guideItems.length > 0}
                  />
                </DetailSection>
              )}
            </div>
          </div>

          <aside className="hidden lg:block lg:self-stretch">
            <div className="sticky top-20">
              <SupportCard
                detail={detail}
                stickyItems={stickyItems}
                isClosed={isClosed}
                isAuthenticated={isAuthenticated}
                coachmarkTarget={staffApplyCoachmarkTarget}
              />
            </div>
          </aside>
        </div>
      </div>

      <MobileApplyBar
        detail={detail}
        isClosed={isClosed}
        coachmarkTarget={staffApplyCoachmarkTarget}
      />
    </main>
  );
}

import type { Metadata } from "next";
import { formatDate } from "@/lib/owner-utils";
import type { Guesthouse, JobPost } from "@/types/database";

const DEFAULT_OG_IMAGE = "/images/og/staffing-og.png";
const DEFAULT_IMAGE_ALT = "제주도 게스트하우스 스탭 모집 플랫폼 스탭핑";
const BRAND_SUFFIX = "스탭핑";

export interface JobPostMetadataInput {
  jobPost: JobPost;
  guesthouse: Guesthouse;
  imageUrl: string | null;
}

export interface BuiltJobPostMetadata {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  imageUrl: string | null;
  imageAlt: string;
  robots: Metadata["robots"];
}

function normalizeText(value: string | null | undefined) {
  const text = value
    ?.replace(/<[^>]*>/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return null;
  if (/^(null|undefined|정보 없음|-)$/.test(text)) return null;
  return text;
}

function normalizeJejuLocation(region: string | null | undefined) {
  const text = normalizeText(region);
  if (!text || text === "기타") return "제주도";

  return (
    text
      .replace(/^제주특별자치도\s*/, "")
      .replace(/^제주도\s*/, "")
      .trim() || "제주도"
  );
}

function formatDateText(value: string | null | undefined) {
  const text = normalizeText(value);
  if (!text) return null;

  try {
    return formatDate(text);
  } catch {
    return text;
  }
}

function buildRecruitmentTitle(guesthouseName: string) {
  return guesthouseName.includes("스탭 모집")
    ? guesthouseName
    : `${guesthouseName} 스탭 모집`;
}

function buildTitle({
  guesthouseName,
  locationLabel,
}: {
  guesthouseName: string;
  locationLabel: string;
}) {
  return `${buildRecruitmentTitle(guesthouseName)} - ${locationLabel}`;
}

function getProvisionSentence(jobPost: JobPost) {
  if (jobPost.provides_accommodation && jobPost.provides_meal) {
    return "숙소와 식사를 제공합니다.";
  }
  if (jobPost.provides_accommodation) return "숙소를 제공합니다.";
  if (jobPost.provides_meal) return "식사를 제공합니다.";
  return "숙소와 식사는 제공되지 않습니다.";
}

function getWorkScheduleText(jobPost: JobPost) {
  return Number.isFinite(jobPost.work_days_per_week) &&
    Number.isFinite(jobPost.off_days_per_week)
    ? `주 ${jobPost.work_days_per_week}일 근무·주 ${jobPost.off_days_per_week}일 휴무`
    : null;
}

function buildDescription({
  guesthouseName,
  locationLabel,
  jobPost,
}: {
  guesthouseName: string;
  locationLabel: string;
  jobPost: JobPost;
}) {
  const workStartDate = formatDateText(jobPost.work_start_date);
  const minWorkPeriod = normalizeText(jobPost.min_work_period);
  const workSchedule = getWorkScheduleText(jobPost);
  const provisionSentence = getProvisionSentence(jobPost);
  const conditionParts = [
    `${locationLabel} 근무`,
    workStartDate ? `${workStartDate}부터` : null,
    minWorkPeriod ? `최소 ${minWorkPeriod}` : null,
    workSchedule,
  ].filter((item): item is string => Boolean(item));
  const conditionSentence =
    conditionParts.length > 0
      ? `${conditionParts.join(", ")}이며 ${provisionSentence}`
      : provisionSentence;

  return `${guesthouseName}에서 함께할 스탭을 모집합니다. ${conditionSentence} 상세 조건을 확인하고 스탭핑에서 지원해 보세요.`;
}

export function buildJobPostMetadata({
  jobPost,
  guesthouse,
  imageUrl,
}: JobPostMetadataInput): BuiltJobPostMetadata {
  const guesthouseName =
    normalizeText(guesthouse.name) ?? "제주 게스트하우스";
  const locationLabel = normalizeJejuLocation(guesthouse.region);
  const title = buildTitle({ guesthouseName, locationLabel });
  const metadataTitle = `${title} | ${BRAND_SUFFIX}`;
  const description = buildDescription({
    guesthouseName,
    locationLabel,
    jobPost,
  });
  const publicImageUrl =
    imageUrl && /^https?:\/\//.test(imageUrl) ? imageUrl : null;
  const imageAlt = publicImageUrl
    ? `${guesthouseName} 게스트하우스 스탭 모집 이미지`
    : DEFAULT_IMAGE_ALT;

  return {
    title,
    description,
    ogTitle: metadataTitle,
    ogDescription: description,
    imageUrl: publicImageUrl ?? DEFAULT_OG_IMAGE,
    imageAlt,
    robots: {
      index: true,
      follow: true,
    },
  };
}

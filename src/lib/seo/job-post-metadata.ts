import type { Metadata } from "next";
import { getStipendTypeLabel } from "@/lib/labels";
import { formatDate } from "@/lib/owner-utils";
import type { Guesthouse, JobPost } from "@/types/database";

const DEFAULT_OG_IMAGE = "/images/og/staffing-og.png";
const DEFAULT_IMAGE_ALT = "제주도 게스트하우스 스탭 모집 플랫폼 스탭핑";

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

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function normalizeRegion(region: string | null | undefined) {
  const text = normalizeText(region);
  if (!text || text === "기타") return null;
  return text.replace(/^제주\s*/, "");
}

function getLocationPhrase(region: string | null) {
  return region ? `제주 ${region}` : "제주";
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

function getStipendText(jobPost: JobPost) {
  if (jobPost.stipend_type === "none") return "급여 없음";

  const description = normalizeText(jobPost.stipend_description);
  if (description && !/^0+\s*원?$/.test(description)) return description;

  return getStipendTypeLabel(jobPost.stipend_type);
}

function getWorkContentText(value: string | null | undefined) {
  const text = normalizeText(value);
  return text ? `주요 업무 ${truncateText(text, 24)}` : null;
}

function joinConditions(parts: string[]) {
  if (parts.length === 0) return null;
  return `근무 조건은 ${parts.join(", ")}입니다.`;
}

function buildTitle({
  guesthouseName,
  region,
  isClosed,
}: {
  guesthouseName: string;
  region: string | null;
  isClosed: boolean;
}) {
  const statusSuffix = isClosed ? " 마감" : "";
  const fullTitle = region
    ? `${region} ${guesthouseName} 스탭 모집${statusSuffix}`
    : `제주 ${guesthouseName} 스탭 모집${statusSuffix}`;

  if (fullTitle.length <= 40) return fullTitle;

  const withoutRegion = `${guesthouseName} 스탭 모집${statusSuffix}`;
  if (withoutRegion.length <= 40) return withoutRegion;

  return `${truncateText(guesthouseName, 24)} 스탭 모집${statusSuffix}`;
}

export function buildJobPostMetadata({
  jobPost,
  guesthouse,
  imageUrl,
}: JobPostMetadataInput): BuiltJobPostMetadata {
  const guesthouseName =
    normalizeText(guesthouse.name) ?? "제주 게스트하우스";
  const region = normalizeRegion(guesthouse.region);
  const location = getLocationPhrase(region);
  const isClosed = jobPost.status === "closed";
  const title = buildTitle({ guesthouseName, region, isClosed });
  const firstSentence = isClosed
    ? `${location} ${guesthouseName}의 스탭 모집이 마감된 공고입니다.`
    : `${location}에 위치한 ${guesthouseName}의 스탭 모집 정보입니다.`;
  const workStartDate = formatDateText(jobPost.work_start_date);
  const conditions = [
    workStartDate ? `${workStartDate}부터 근무` : null,
    normalizeText(jobPost.min_work_period)
      ? `최소 ${normalizeText(jobPost.min_work_period)}`
      : null,
    Number.isFinite(jobPost.work_days_per_week) &&
    Number.isFinite(jobPost.off_days_per_week)
      ? `주 ${jobPost.work_days_per_week}일 근무 · 주 ${jobPost.off_days_per_week}일 휴무`
      : null,
    jobPost.provides_accommodation ? "숙소 제공" : "숙소 미제공",
    jobPost.provides_meal ? "식사 제공" : "식사 미제공",
    getStipendText(jobPost),
    getWorkContentText(jobPost.work_content),
    jobPost.recruit_count > 0 ? `${jobPost.recruit_count}명 모집` : null,
  ].filter((item): item is string => Boolean(item));
  const secondSentence =
    joinConditions(conditions.slice(0, 4)) ??
    "모집 일정과 주요 업무는 모집글에서 확인할 수 있습니다.";
  const thirdSentence = isClosed
    ? "마감된 모집 조건과 게스트하우스 정보를 스탭핑에서 확인할 수 있습니다."
    : "근무 일정과 제공 조건을 확인한 뒤 스탭핑에서 지원할 수 있습니다.";
  const description = [firstSentence, secondSentence, thirdSentence].join(" ");
  const publicImageUrl =
    imageUrl && /^https?:\/\//.test(imageUrl) ? imageUrl : null;
  const imageAlt = publicImageUrl
    ? `${guesthouseName} 게스트하우스 스탭 모집 이미지`
    : DEFAULT_IMAGE_ALT;

  return {
    title,
    description,
    ogTitle: `${title} | 스탭핑`,
    ogDescription: description,
    imageUrl: publicImageUrl ?? DEFAULT_OG_IMAGE,
    imageAlt,
    robots: {
      index: true,
      follow: true,
    },
  };
}

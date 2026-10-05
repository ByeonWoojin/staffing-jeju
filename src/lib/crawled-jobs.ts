import "server-only";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// 네이버 카페 수집 공고 (scripts/crawl-naver-cafe.mjs 가 만든 .crawl/feed.json).
// 로컬 확인용 프로토타입: DB 없이 파일을 읽고, 프로덕션에서는 항상 빈 목록을 돌려준다.
// ponytail: DB 이관 시 source='crawled' 행을 읽도록 교체 (docs/CRAWL_PIPELINE.md §6).

export type ApplyChannel =
  | "instagram"
  | "openchat"
  | "form"
  | "sms"
  | "kakao"
  | "email"
  | "original";

export interface CrawledJob {
  id: string;
  url: string;
  writtenAt: string;
  firstPostedAt: string;
  reposts: number;
  title: string;
  guesthouse: {
    name: string | null;
    region: string | null;
    address_text: string | null;
    map_url: string | null;
  };
  fields: {
    recruit_count: number;
    gender_condition: "any" | "male" | "female";
    age_condition: string | null;
    work_start_date: string;
    min_work_period: string;
    work_content: string | null;
    work_time: string | null;
    work_days_per_week: number | null;
    off_days_per_week: number | null;
    stipend_type: "none" | "provided" | "negotiable" | "custom";
    stipend_description: string | null;
    provides_accommodation: boolean | null;
    provides_meal: boolean | null;
    has_party: boolean | null;
    party_description: string | null;
    is_urgent: boolean;
    preferred_conditions: string | null;
    caution: string | null;
    description: string;
  };
  party_kind: "party" | "potluck" | "none" | null;
  apply: {
    channel: ApplyChannel;
    url: string | null;
    phone: string | null;
    phones: string[];
    email: string | null;
    emails: string[];
    kakaoId: string | null;
    hint: string | null;
  };
  tags: string[];
  thumbnail: string | null;
  missing: string[];
  assumed: string[];
  derived: string[];
}

type Params = Record<string, string | string[] | undefined>;

const FEED_PATH = path.join(process.cwd(), ".crawl", "feed.json");
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function readFeed(): CrawledJob[] {
  if (process.env.NODE_ENV === "production" || !existsSync(FEED_PATH)) return [];
  try {
    return JSON.parse(readFileSync(FEED_PATH, "utf8")) as CrawledJob[];
  } catch {
    return [];
  }
}

// 한국 시간 기준 날짜(YYYY-MM-DD)
export const kstDate = (value: string | Date) =>
  new Date(value).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

// "오늘 새로 올라온" 모집글: 가장 처음 올라온 시각이 오늘(KST)인 글. 어제 글을 오늘 다시 올린 끌올은 새 글이 아니므로 제외.
export function getTodayCrawledJobs(searchParams: Params): CrawledJob[] {
  const today = kstDate(new Date());
  return getCrawledJobs(searchParams).filter((job) => kstDate(job.firstPostedAt) === today);
}

export function getCrawledJob(id: string) {
  return readFeed().find((job) => job.id === id) ?? null;
}

// 기존 /jobs 필터(public-job-data.ts applyJobPostQueryFilters)와 같은 의미로 거른다.
export function getCrawledJobs(searchParams: Params): CrawledJob[] {
  const region = first(searchParams.region);
  const gender = first(searchParams.gender);
  const bool = (key: string) => {
    const v = first(searchParams[key]);
    return v === "true" ? true : v === "false" ? false : null;
  };
  const [party, accommodation, meal, paid] = ["party", "accommodation", "meal", "paid"].map(bool);
  const urgent = first(searchParams.urgent) === "true";
  const q = first(searchParams.q).trim().toLowerCase();
  const [start, end] = [first(searchParams.arrivalStart), first(searchParams.arrivalEnd)];

  return readFeed().filter(({ guesthouse: g, fields: f, title }) => {
    if (region && g.region !== region) return false;
    if (gender && f.gender_condition !== gender) return false;
    if (party !== null && Boolean(f.has_party) !== party) return false;
    if (accommodation !== null && Boolean(f.provides_accommodation) !== accommodation) return false;
    if (meal !== null && Boolean(f.provides_meal) !== meal) return false;
    if (paid !== null && (f.stipend_type !== "none") !== paid) return false;
    if (urgent && !f.is_urgent) return false;
    if (start && f.work_start_date < start) return false;
    if (end && f.work_start_date > end) return false; // ASAP(9999-12-31)는 기존 공고와 동일하게 종료일 필터에서 제외
    if (q && ![title, f.work_content, f.description].some((t) => t?.toLowerCase().includes(q))) return false;
    return true;
  });
}

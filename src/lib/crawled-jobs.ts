import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// 네이버 카페에서 수집한 외부 모집글 (public.crawled_job_posts, scripts/import-crawled-jobs.mjs 가 채운다).
// 로그인 전에는 가려야 하는 값(연락처·지원 안내·상세 조건)을 아예 조회하지 않는다 → HTML/RSC 에도 실리지 않는다.

const TABLE = "crawled_job_posts";
const BUCKET = "crawled-job-images";
const TODAY_LIMIT = 60;
const ALL_LIMIT = 200;

export type ApplyChannel = "instagram" | "openchat" | "form" | "sms" | "kakao" | "email" | "original";

export interface CrawledJobRow {
  id: string;
  source_url: string;
  first_posted_at: string;
  posted_at: string;
  repost_count: number;
  title: string;
  guesthouse_name: string | null;
  region: string | null;
  address_text: string | null;
  map_url: string | null;
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
  provides_accommodation: boolean;
  provides_meal: boolean;
  has_party: boolean;
  party_kind: "party" | "potluck" | "none" | null;
  party_description: string | null;
  is_urgent: boolean;
  preferred_conditions: string | null;
  caution: string | null;
  description: string | null;
  intro: string | null;
  highlights: Array<{ title: string; items: string[] }>;
  apply_channel: ApplyChannel;
  apply_url: string | null;
  apply_phones: string[];
  apply_emails: string[];
  apply_kakao_id: string | null;
  apply_hint: string | null;
  thumbnail_path: string | null;
  status: "visible" | "hidden" | "closed";
}

const CARD_COLUMNS = [
  "id", "title", "guesthouse_name", "region", "thumbnail_path", "work_start_date", "min_work_period",
  "work_days_per_week", "off_days_per_week", "provides_accommodation", "provides_meal", "stipend_type",
  "party_kind", "is_urgent", "first_posted_at", "posted_at",
] as const;
const PUBLIC_COLUMNS = ["id", "title", "guesthouse_name", "region", "thumbnail_path", "status", "first_posted_at", "is_urgent"] as const;

type WithThumb<T> = T & { thumbnail_url: string | null };
export type CrawledJobCard = WithThumb<Pick<CrawledJobRow, (typeof CARD_COLUMNS)[number]>>;
export type CrawledJobPublic = WithThumb<Pick<CrawledJobRow, (typeof PUBLIC_COLUMNS)[number]>>;
export type CrawledJobFull = WithThumb<CrawledJobRow>;

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const toBool = (v: string) => (v === "true" ? true : v === "false" ? false : null);
const normalizeKeyword = (k: string) => k.replace(/[%,()]/g, " ").trim();

// 한국 시간 기준 날짜(YYYY-MM-DD)
export const kstDate = (value: string | Date) => new Date(value).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
const todayStartIso = () => new Date(`${kstDate(new Date())}T00:00:00+09:00`).toISOString();

function withThumb<T extends { thumbnail_path: string | null }>(supabase: ReturnType<typeof createSupabaseAdminClient>, row: T): WithThumb<T> {
  const url = row.thumbnail_path ? supabase.storage.from(BUCKET).getPublicUrl(row.thumbnail_path).data.publicUrl : null;
  return { ...row, thumbnail_url: url };
}

export interface TodayCrawledJobs {
  jobs: CrawledJobCard[];
  /** 필터와 무관한 오늘 올라온 글 수(새 글 + 끌올) */
  todayTotal: number;
  /** 그중 오늘 처음 올라온 새 글 수 */
  todayNew: number;
  /** 테이블이 없거나 조회 실패 → 섹션을 숨긴다 (마이그레이션 적용 전에도 /jobs 가 깨지지 않게) */
  available: boolean;
}

// 필터 의미는 기존 /jobs(public-job-data.ts applyJobPostQueryFilters)와 같다.
async function fetchCrawledJobs(searchParams: Params, todayOnly: boolean, limit: number, includeBumped = true): Promise<TodayCrawledJobs> {
  try {
    const supabase = createSupabaseAdminClient();
    const since = todayStartIso();

    const base = () => supabase.from(TABLE).select("id", { count: "exact", head: true }).eq("status", "visible");
    const [count, newCount] = await Promise.all([base().gte("posted_at", since), base().gte("first_posted_at", since)]);
    if (count.error) throw count.error;
    if (newCount.error) throw newCount.error;

    let query = supabase.from(TABLE).select(CARD_COLUMNS.join(",")).eq("status", "visible");
    if (todayOnly) query = query.gte("posted_at", since);

    const region = first(searchParams.region);
    if (region) query = query.eq("region", region);
    const gender = first(searchParams.gender);
    if (gender) query = query.eq("gender_condition", gender);
    const party = toBool(first(searchParams.party));
    if (party !== null) query = query.eq("has_party", party);
    const accommodation = toBool(first(searchParams.accommodation));
    if (accommodation !== null) query = query.eq("provides_accommodation", accommodation);
    const meal = toBool(first(searchParams.meal));
    if (meal !== null) query = query.eq("provides_meal", meal);
    const paid = toBool(first(searchParams.paid));
    if (paid === true) query = query.neq("stipend_type", "none");
    else if (paid === false) query = query.eq("stipend_type", "none");
    if (first(searchParams.urgent) === "true") query = query.eq("is_urgent", true);
    const [start, end] = [first(searchParams.arrivalStart), first(searchParams.arrivalEnd)];
    if (start) query = query.gte("work_start_date", start);
    if (end) query = query.lte("work_start_date", end); // ASAP(9999-12-31)는 기존 공고와 동일하게 종료일 필터에서 제외
    const keyword = normalizeKeyword(first(searchParams.q));
    if (keyword) query = query.or(`title.ilike.%${keyword}%,work_content.ilike.%${keyword}%,description.ilike.%${keyword}%`);

    const { data, error } = await query.order("posted_at", { ascending: false }).limit(limit);
    if (error) throw error;

    const all = (data ?? []) as unknown as Array<Pick<CrawledJobRow, (typeof CARD_COLUMNS)[number]>>;
    const rows = includeBumped ? all : all.filter((row) => !isBumped(row));
    return { jobs: rows.map((row) => withThumb(supabase, row)), todayTotal: count.count ?? 0, todayNew: newCount.count ?? 0, available: true };
  } catch (error) {
    console.error("[crawled-jobs] 오늘 수집 공고 조회 실패", error instanceof Error ? error.message : error);
    return { jobs: [], todayTotal: 0, todayNew: 0, available: false };
  }
}

// "오늘 올라온" 모집글: 마지막 게시 시각이 오늘(KST)인 글. 어제 글을 다시 올린 끌올도 포함하고 카드에 끌올 뱃지를 단다.
export const getTodayCrawledJobs = (searchParams: Params) => fetchCrawledJobs(searchParams, true, TODAY_LIMIT);

// 전체보기: 오늘 이전에 올라온 글까지 모두 (최신순)
export const getAllCrawledJobs = (searchParams: Params, includeBumped = true) => fetchCrawledJobs(searchParams, false, ALL_LIMIT, includeBumped);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 상세: 로그인 전에는 제목·게하명·지역·대표 이미지·급구 여부만 조회한다. 상세 조건/연락처 컬럼은 로그인 후에만 읽는다.
export async function getCrawledJobDetail(
  id: string,
  isAuthenticated: boolean,
): Promise<{ job: CrawledJobPublic; full: CrawledJobFull | null } | null> {
  if (!UUID.test(id)) return null;

  try {
    const supabase = createSupabaseAdminClient();
    if (!isAuthenticated) {
      const { data, error } = await supabase.from(TABLE).select(PUBLIC_COLUMNS.join(",")).eq("id", id).neq("status", "hidden").maybeSingle();
      if (error) throw error;
      return data ? { job: withThumb(supabase, data as unknown as Pick<CrawledJobRow, (typeof PUBLIC_COLUMNS)[number]>), full: null } : null;
    }

    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).neq("status", "hidden").maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const full = withThumb(supabase, data as unknown as CrawledJobRow);
    return { job: full, full };
  } catch (error) {
    console.error("[crawled-jobs] 수집 공고 상세 조회 실패", error instanceof Error ? error.message : error);
    return null;
  }
}

// 처음 올라온 날과 마지막 게시일이 다르면 끌올
export const isBumped = (job: { first_posted_at: string; posted_at: string }) => kstDate(job.first_posted_at) !== kstDate(job.posted_at);

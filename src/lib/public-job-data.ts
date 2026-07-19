import "server-only";

import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import { getGenderConditionLabel, getStipendTypeLabel } from "@/lib/labels";
import { normalizeImageSource } from "@/lib/guesthouse-image";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Application,
  GenderCondition,
  Guesthouse,
  GuesthousePhoto,
  JobPost,
  JobPostPhoto,
  Profile,
} from "@/types/database";

export interface PublicJobPhoto {
  id: string;
  url: string;
  altText: string;
}

export interface PublicJobCard {
  jobPost: JobPost;
  guesthouse: Guesthouse;
  imageUrl: string | null;
  isFavorited: boolean;
}

export interface PublicJobDetail extends PublicJobCard {
  jobPostPhotos: PublicJobPhoto[];
  guesthousePhotos: PublicJobPhoto[];
  viewerApplication: Application | null;
}

export interface PublicJobFilters {
  q: string;
  region: string;
  start: string;
  arrivalStart: string;
  arrivalEnd: string;
  gender: string;
  party: string;
  paid: string;
  accommodation: string;
  meal: string;
  urgent: string;
}

export interface PublicJobsResult {
  jobs: PublicJobCard[];
  filters: PublicJobFilters;
  pagination: PublicJobsPagination;
  viewerProfile: Profile | null;
}

export interface PublicJobsPagination {
  pageSize: number;
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const PUBLIC_JOBS_PAGE_SIZE = 20;

const emptyFilters: PublicJobFilters = {
  q: "",
  region: "",
  start: "",
  arrivalStart: "",
  arrivalEnd: "",
  gender: "",
  party: "",
  paid: "",
  accommodation: "",
  meal: "",
  urgent: "",
};

type QueryValue = string | string[] | undefined;
type SearchParams = Record<string, QueryValue>;

function getQueryValue(searchParams: SearchParams, key: keyof PublicJobFilters) {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function normalizeFilters(searchParams: SearchParams): PublicJobFilters {
  return {
    q: getQueryValue(searchParams, "q").trim(),
    region: getQueryValue(searchParams, "region"),
    start: getQueryValue(searchParams, "start"),
    arrivalStart: getQueryValue(searchParams, "arrivalStart"),
    arrivalEnd: getQueryValue(searchParams, "arrivalEnd"),
    gender: getQueryValue(searchParams, "gender"),
    party: getQueryValue(searchParams, "party"),
    paid: getQueryValue(searchParams, "paid"),
    accommodation: getQueryValue(searchParams, "accommodation"),
    meal: getQueryValue(searchParams, "meal"),
    urgent: getQueryValue(searchParams, "urgent"),
  };
}

function normalizePage(searchParams: SearchParams) {
  const value = searchParams.page;
  const rawPage = Array.isArray(value) ? value[0] : value;
  const page = Number(rawPage);

  if (!Number.isFinite(page)) return 1;

  const normalizedPage = Math.floor(page);
  return normalizedPage >= 1 ? normalizedPage : 1;
}

function normalizeKeyword(keyword: string) {
  return keyword.replace(/[%,()]/g, " ").trim();
}

function getPublicUrl(bucket: "guesthouse-images" | "job-post-images", path: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function parseDateOnly(dateText: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return null;

  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function sortPhotosByTarget<T extends GuesthousePhoto | JobPostPhoto>(
  photos: T[],
  targetKey: keyof T,
) {
  const grouped = new Map<string, T[]>();
  for (const photo of photos) {
    if (!normalizeImageSource(photo.photo_path)) continue;

    const targetId = String(photo[targetKey]);
    const current = grouped.get(targetId) ?? [];
    current.push(photo);
    grouped.set(targetId, current);
  }

  for (const group of grouped.values()) {
    group.sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  return grouped;
}

async function getViewerProfile() {
  const user = await getCurrentAuthUser();
  if (!user) return null;

  try {
    return await getProfileById(user.id);
  } catch (error) {
    console.error("[public-job-data] viewer profile lookup failed", error);
    return null;
  }
}

async function getFavoriteGuesthouseIds(
  profile: Profile | null,
  guesthouseIds: string[],
) {
  if (!profile || profile.role !== "staff" || guesthouseIds.length === 0) {
    return new Set<string>();
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("staff_favorite_guesthouses")
    .select("guesthouse_id")
    .eq("staff_id", profile.id)
    .in("guesthouse_id", guesthouseIds);

  if (error) {
    console.error("[public-job-data] favorite lookup failed", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return new Set<string>();
  }

  return new Set((data ?? []).map((favorite) => favorite.guesthouse_id as string));
}

async function getViewerApplication(profile: Profile | null, jobPost: JobPost) {
  if (!profile || profile.role !== "staff") return null;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("job_post_id", jobPost.id)
    .eq("staff_id", profile.id)
    .eq("recruitment_cycle", jobPost.recruitment_cycle)
    .maybeSingle();

  if (error) {
    console.error("[public-job-data] viewer application lookup failed", {
      jobPostId: jobPost.id,
      staffId: profile.id,
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return null;
  }

  return (data as Application | null) ?? null;
}

function getNormalizedDateRange(filters: PublicJobFilters) {
  let start = parseDateOnly(filters.arrivalStart);
  let end = parseDateOnly(filters.arrivalEnd);

  if (start && end && start > end) {
    [start, end] = [end, start];
  }

  return {
    start: start ? filters.arrivalStart : "",
    end: end ? filters.arrivalEnd : "",
  };
}

function getLegacyStartRange(filters: PublicJobFilters) {
  if (filters.arrivalStart || filters.arrivalEnd || !filters.start) {
    return null;
  }

  const days = Number(filters.start);
  if (!Number.isFinite(days) || days <= 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(today.getDate() + days);

  return {
    start: today.toISOString().slice(0, 10),
    end: limit.toISOString().slice(0, 10),
  };
}

function toBooleanFilter(value: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

type SupabaseQueryBuilder = {
  eq: (column: string, value: unknown) => SupabaseQueryBuilder;
  neq: (column: string, value: unknown) => SupabaseQueryBuilder;
  gte: (column: string, value: unknown) => SupabaseQueryBuilder;
  in: (column: string, values: readonly unknown[]) => SupabaseQueryBuilder;
  lte: (column: string, value: unknown) => SupabaseQueryBuilder;
  order: (
    column: string,
    options?: { ascending?: boolean; foreignTable?: string },
  ) => SupabaseQueryBuilder;
  or: (filters: string) => SupabaseQueryBuilder;
  range: (from: number, to: number) => SupabaseQueryBuilder;
  then: PromiseLike<{
    data: unknown;
    count: number | null;
    error: {
      message: string;
      code?: string;
      details?: string;
    } | null;
  }>["then"];
};

function applyJobPostQueryFilters(
  query: SupabaseQueryBuilder,
  filters: PublicJobFilters,
) {
  let nextQuery = query.neq("status", "hidden");

  const dateRange = getNormalizedDateRange(filters);
  if (dateRange.start) {
    nextQuery = nextQuery.gte("work_start_date", dateRange.start);
  }
  if (dateRange.end) {
    nextQuery = nextQuery.lte("work_start_date", dateRange.end);
  }

  const legacyStartRange = getLegacyStartRange(filters);
  if (legacyStartRange) {
    nextQuery = nextQuery
      .gte("work_start_date", legacyStartRange.start)
      .lte("work_start_date", legacyStartRange.end);
  }

  if (filters.gender) {
    nextQuery = nextQuery.eq("gender_condition", filters.gender as GenderCondition);
  }

  const party = toBooleanFilter(filters.party);
  if (party !== null) {
    nextQuery = nextQuery.eq("has_party", party);
  }

  const accommodation = toBooleanFilter(filters.accommodation);
  if (accommodation !== null) {
    nextQuery = nextQuery.eq("provides_accommodation", accommodation);
  }

  const meal = toBooleanFilter(filters.meal);
  if (meal !== null) {
    nextQuery = nextQuery.eq("provides_meal", meal);
  }

  const paid = toBooleanFilter(filters.paid);
  if (paid === true) {
    nextQuery = nextQuery.neq("stipend_type", "none");
  } else if (paid === false) {
    nextQuery = nextQuery.eq("stipend_type", "none");
  }

  if (filters.urgent === "true") {
    nextQuery = nextQuery.eq("is_urgent", true);
  }

  const keyword = normalizeKeyword(filters.q);
  if (keyword) {
    nextQuery = nextQuery.or(
      `title.ilike.%${keyword}%,work_content.ilike.%${keyword}%,description.ilike.%${keyword}%`,
    );
  }

  return nextQuery;
}

async function getFilteredGuesthouseIds(filters: PublicJobFilters) {
  if (!filters.region) return null;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("guesthouses")
    .select("id")
    .eq("region", filters.region);

  if (error) {
    console.error("[public-job-data] filtered guesthouse lookup failed", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return [];
  }

  return (data ?? []).map((guesthouse) => guesthouse.id as string);
}

async function getFilteredPublicJobCount(
  filters: PublicJobFilters,
  filteredGuesthouseIds: string[] | null,
) {
  if (filteredGuesthouseIds && filteredGuesthouseIds.length === 0) return 0;

  const supabase = createSupabaseAdminClient();
  let query = applyJobPostQueryFilters(
    supabase.from("job_posts").select("id", {
      count: "exact",
      head: true,
    }) as unknown as SupabaseQueryBuilder,
    filters,
  );

  if (filteredGuesthouseIds) {
    query = query.in("guesthouse_id", filteredGuesthouseIds);
  }

  const { count, error } = await query;

  if (error) {
    console.error("[public-job-data] public job count failed", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return 0;
  }

  return count ?? 0;
}

async function getPagedPublicJobCards({
  viewerProfile,
  filters,
  currentPage,
  filteredGuesthouseIds,
}: {
  viewerProfile: Profile | null;
  filters: PublicJobFilters;
  currentPage: number;
  filteredGuesthouseIds: string[] | null;
}) {
  if (filteredGuesthouseIds && filteredGuesthouseIds.length === 0) return [];

  const supabase = createSupabaseAdminClient();
  const from = (currentPage - 1) * PUBLIC_JOBS_PAGE_SIZE;
  const to = from + PUBLIC_JOBS_PAGE_SIZE - 1;
  let filteredQuery = applyJobPostQueryFilters(
    supabase.from("job_posts").select("*") as unknown as SupabaseQueryBuilder,
    filters,
  );

  if (filteredGuesthouseIds) {
    filteredQuery = filteredQuery.in("guesthouse_id", filteredGuesthouseIds);
  }

  const query = filteredQuery
    .order("status", { ascending: true })
    .order("is_urgent", { ascending: false })
    .order("bumped_at", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data: jobPosts, error: jobPostError } = await query;

  if (jobPostError) {
    console.error("[public-job-data] paged public job lookup failed", {
      message: jobPostError.message,
      code: jobPostError.code,
      details: jobPostError.details,
    });
    return [];
  }

  const jobPostRows = (jobPosts ?? []) as JobPost[];
  if (jobPostRows.length === 0) return [];

  const guesthouseIds = [...new Set(jobPostRows.map((job) => job.guesthouse_id))];
  const jobPostIds = jobPostRows.map((job) => job.id);

  const [
    { data: guesthouses, error: guesthouseError },
    { data: jobPhotos, error: jobPhotoError },
    { data: guesthousePhotos, error: guesthousePhotoError },
  ] = await Promise.all([
    supabase.from("guesthouses").select("*").in("id", guesthouseIds),
    supabase.from("job_post_photos").select("*").in("job_post_id", jobPostIds),
    supabase
      .from("guesthouse_photos")
      .select("*")
      .in("guesthouse_id", guesthouseIds),
  ]);

  if (guesthouseError) throw guesthouseError;
  if (jobPhotoError) throw jobPhotoError;
  if (guesthousePhotoError) throw guesthousePhotoError;

  const guesthouseById = new Map(
    ((guesthouses ?? []) as Guesthouse[]).map((guesthouse) => [
      guesthouse.id,
      guesthouse,
    ]),
  );
  const jobs = jobPostRows.flatMap((jobPost) => {
    const guesthouse = guesthouseById.get(jobPost.guesthouse_id);
    if (!guesthouse) return [];
    return [{ jobPost, guesthouse }];
  });
  if (jobs.length === 0) return [];

  const jobPhotosByJobPostId = sortPhotosByTarget(
    (jobPhotos ?? []) as JobPostPhoto[],
    "job_post_id",
  );
  const guesthousePhotosByGuesthouseId = sortPhotosByTarget(
    (guesthousePhotos ?? []) as GuesthousePhoto[],
    "guesthouse_id",
  );
  const favoriteIds = await getFavoriteGuesthouseIds(viewerProfile, guesthouseIds);

  return jobs.map(({ jobPost, guesthouse }) => {
    const firstJobPhoto = jobPhotosByJobPostId.get(jobPost.id)?.[0];
    const firstGuesthousePhoto = guesthousePhotosByGuesthouseId.get(guesthouse.id)?.[0];
    const imageUrl = firstGuesthousePhoto
      ? getPublicUrl("guesthouse-images", firstGuesthousePhoto.photo_path)
      : firstJobPhoto
        ? getPublicUrl("job-post-images", firstJobPhoto.photo_path)
        : null;

    return {
      jobPost,
      guesthouse,
      imageUrl,
      isFavorited: favoriteIds.has(guesthouse.id),
    };
  });
}

export async function getPublicJobs(
  searchParams: SearchParams,
): Promise<PublicJobsResult> {
  const filters = normalizeFilters(searchParams);
  const requestedPage = normalizePage(searchParams);
  const viewerProfile = await getViewerProfile();
  const filteredGuesthouseIds = await getFilteredGuesthouseIds(filters);
  const totalCount = await getFilteredPublicJobCount(filters, filteredGuesthouseIds);
  const totalPages = Math.max(1, Math.ceil(totalCount / PUBLIC_JOBS_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const jobs =
    totalCount > 0
      ? await getPagedPublicJobCards({
          viewerProfile,
          filters,
          currentPage,
          filteredGuesthouseIds,
        })
      : [];

  return {
    jobs,
    filters,
    pagination: {
      pageSize: PUBLIC_JOBS_PAGE_SIZE,
      totalCount,
      totalPages,
      currentPage,
    },
    viewerProfile,
  };
}

export async function getPublicJobBySlug(
  slug: string,
): Promise<{ detail: PublicJobDetail | null; viewerProfile: Profile | null }> {
  const viewerProfile = await getViewerProfile();
  const supabase = createSupabaseAdminClient();

  const { data: jobPost, error: jobPostError } = await supabase
    .from("job_posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (jobPostError) {
    console.error("[public-job-data] job detail lookup failed", {
      slug,
      message: jobPostError.message,
      code: jobPostError.code,
      details: jobPostError.details,
    });
    throw new Error("모집글 상세 정보를 불러오지 못했습니다.");
  }

  if (!jobPost || jobPost.status === "hidden") {
    return { detail: null, viewerProfile };
  }

  const job = jobPost as JobPost;
  const [
    { data: guesthouse, error: guesthouseError },
    { data: jobPhotos, error: jobPhotoError },
    { data: guesthousePhotos, error: guesthousePhotoError },
  ] = await Promise.all([
    supabase.from("guesthouses").select("*").eq("id", job.guesthouse_id).maybeSingle(),
    supabase
      .from("job_post_photos")
      .select("*")
      .eq("job_post_id", job.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("guesthouse_photos")
      .select("*")
      .eq("guesthouse_id", job.guesthouse_id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (guesthouseError || jobPhotoError || guesthousePhotoError || !guesthouse) {
    console.error("[public-job-data] job detail relation lookup failed", {
      slug,
      guesthouseError,
      jobPhotoError,
      guesthousePhotoError,
    });
    throw new Error("모집글 관련 정보를 불러오지 못했습니다.");
  }

  const favoriteIds = await getFavoriteGuesthouseIds(viewerProfile, [job.guesthouse_id]);
  const viewerApplication = await getViewerApplication(viewerProfile, job);
  const mappedJobPhotos = ((jobPhotos ?? []) as JobPostPhoto[]).flatMap(
    (photo, index) => {
      const photoPath = normalizeImageSource(photo.photo_path);
      return photoPath
        ? [
            {
              id: photo.id,
              url: getPublicUrl("job-post-images", photoPath),
              altText: photo.alt_text ?? `${job.title} 상세 사진 ${index + 1}`,
            },
          ]
        : [];
    },
  );
  const mappedGuesthousePhotos = (
    (guesthousePhotos ?? []) as GuesthousePhoto[]
  ).flatMap((photo, index) => {
    const photoPath = normalizeImageSource(photo.photo_path);
    return photoPath
      ? [
          {
            id: photo.id,
            url: getPublicUrl("guesthouse-images", photoPath),
            altText: photo.alt_text ?? `${guesthouse.name} 공간 사진 ${index + 1}`,
          },
        ]
      : [];
  });

  return {
    viewerProfile,
    detail: {
      jobPost: job,
      guesthouse: guesthouse as Guesthouse,
      imageUrl: mappedGuesthousePhotos[0]?.url ?? mappedJobPhotos[0]?.url ?? null,
      isFavorited: favoriteIds.has(job.guesthouse_id),
      jobPostPhotos: mappedJobPhotos,
      guesthousePhotos: mappedGuesthousePhotos,
      viewerApplication,
    },
  };
}

export function getPaidLabel(stipendType: JobPost["stipend_type"]) {
  return stipendType === "none" ? "급여 없음" : "급여/보상 있음";
}

export function getConditionSummary(jobPost: JobPost) {
  return [
    getGenderConditionLabel(jobPost.gender_condition),
    jobPost.has_party ? "파티 있음" : "파티 없음",
    getPaidLabel(jobPost.stipend_type),
    jobPost.provides_accommodation ? "숙소 제공" : "숙소 미제공",
    jobPost.provides_meal ? "식사 제공" : "식사 미제공",
  ];
}

export function getStipendSummary(jobPost: JobPost) {
  return `${getStipendTypeLabel(jobPost.stipend_type)}${
    jobPost.stipend_description ? ` · ${jobPost.stipend_description}` : ""
  }`;
}

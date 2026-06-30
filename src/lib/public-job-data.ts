import "server-only";

import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import { getGenderConditionLabel, getStipendTypeLabel } from "@/lib/labels";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
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
  viewerProfile: Profile | null;
}

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

function getPublicUrl(bucket: "guesthouse-images" | "job-post-images", path: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function isWithinDays(dateText: string, daysText: string) {
  const days = Number(daysText);
  if (!Number.isFinite(days) || days <= 0) return true;

  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(today.getDate() + days);

  return date >= today && date <= limit;
}

function parseDateOnly(dateText: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return null;

  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function isWithinDateRange(dateText: string, startText: string, endText: string) {
  const date = parseDateOnly(dateText);
  if (!date) return false;

  let start = parseDateOnly(startText);
  let end = parseDateOnly(endText);

  if (start && end && start > end) {
    [start, end] = [end, start];
  }

  if (start && date < start) return false;
  if (end && date > end) return false;

  return true;
}

function includesKeyword(card: PublicJobCard, keyword: string) {
  if (!keyword) return true;
  const target = [
    card.jobPost.title,
    card.guesthouse.name,
    card.guesthouse.region,
    card.jobPost.work_content,
    card.jobPost.description ?? "",
    card.guesthouse.description ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return target.includes(keyword.toLowerCase());
}

function matchesBooleanFilter(value: boolean, filter: string) {
  if (!filter) return true;
  if (filter === "true") return value;
  if (filter === "false") return !value;
  return true;
}

function applyFilters(jobs: PublicJobCard[], filters: PublicJobFilters) {
  return jobs.filter((card) => {
    if (!includesKeyword(card, filters.q)) return false;
    if (filters.region && card.guesthouse.region !== filters.region) return false;
    if (
      (filters.arrivalStart || filters.arrivalEnd) &&
      !isWithinDateRange(
        card.jobPost.work_start_date,
        filters.arrivalStart,
        filters.arrivalEnd,
      )
    ) {
      return false;
    }
    if (
      !filters.arrivalStart &&
      !filters.arrivalEnd &&
      filters.start &&
      !isWithinDays(card.jobPost.work_start_date, filters.start)
    ) {
      return false;
    }
    if (
      filters.gender &&
      card.jobPost.gender_condition !== (filters.gender as GenderCondition)
    ) {
      return false;
    }
    if (!matchesBooleanFilter(card.jobPost.has_party, filters.party)) return false;
    if (!matchesBooleanFilter(card.jobPost.stipend_type !== "none", filters.paid)) {
      return false;
    }
    if (
      !matchesBooleanFilter(
        card.jobPost.provides_accommodation,
        filters.accommodation,
      )
    ) {
      return false;
    }
    if (!matchesBooleanFilter(card.jobPost.provides_meal, filters.meal)) return false;
    if (filters.urgent === "true" && !card.jobPost.is_urgent) return false;
    return true;
  });
}

function sortPhotosByTarget<T extends GuesthousePhoto | JobPostPhoto>(
  photos: T[],
  targetKey: keyof T,
) {
  const grouped = new Map<string, T[]>();
  for (const photo of photos) {
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

async function getOpenJobCards(viewerProfile: Profile | null) {
  const supabase = createSupabaseAdminClient();
  const { data: jobPosts, error: jobPostError } = await supabase
    .from("job_posts")
    .select("*")
    .eq("status", "open")
    .order("is_urgent", { ascending: false })
    .order("bumped_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (jobPostError) {
    console.error("[public-job-data] open job lookup failed", {
      message: jobPostError.message,
      code: jobPostError.code,
      details: jobPostError.details,
    });
    return [];
  }

  const jobs = (jobPosts ?? []) as JobPost[];
  if (jobs.length === 0) return [];

  const guesthouseIds = [...new Set(jobs.map((job) => job.guesthouse_id))];
  const jobPostIds = jobs.map((job) => job.id);

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
  const jobPhotosByJobPostId = sortPhotosByTarget(
    (jobPhotos ?? []) as JobPostPhoto[],
    "job_post_id",
  );
  const guesthousePhotosByGuesthouseId = sortPhotosByTarget(
    (guesthousePhotos ?? []) as GuesthousePhoto[],
    "guesthouse_id",
  );
  const favoriteIds = await getFavoriteGuesthouseIds(viewerProfile, guesthouseIds);

  return jobs.flatMap((jobPost) => {
    const guesthouse = guesthouseById.get(jobPost.guesthouse_id);
    if (!guesthouse) return [];

    const firstJobPhoto = jobPhotosByJobPostId.get(jobPost.id)?.[0];
    const firstGuesthousePhoto = guesthousePhotosByGuesthouseId.get(guesthouse.id)?.[0];
    const imageUrl = firstJobPhoto
      ? getPublicUrl("job-post-images", firstJobPhoto.photo_path)
      : firstGuesthousePhoto
        ? getPublicUrl("guesthouse-images", firstGuesthousePhoto.photo_path)
        : null;

    return [
      {
        jobPost,
        guesthouse,
        imageUrl,
        isFavorited: favoriteIds.has(guesthouse.id),
      },
    ];
  });
}

export async function getPublicJobs(
  searchParams: SearchParams,
): Promise<PublicJobsResult> {
  const filters = normalizeFilters(searchParams);
  const viewerProfile = await getViewerProfile();
  const jobs = await getOpenJobCards(viewerProfile);

  return {
    jobs: applyFilters(jobs, filters),
    filters,
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
    return { detail: null, viewerProfile };
  }

  if (!jobPost || jobPost.status !== "open") {
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
    return { detail: null, viewerProfile };
  }

  const favoriteIds = await getFavoriteGuesthouseIds(viewerProfile, [job.guesthouse_id]);
  const mappedJobPhotos = ((jobPhotos ?? []) as JobPostPhoto[]).map((photo) => ({
    id: photo.id,
    url: getPublicUrl("job-post-images", photo.photo_path),
    altText: photo.alt_text ?? `${job.title} 사진`,
  }));
  const mappedGuesthousePhotos = ((guesthousePhotos ?? []) as GuesthousePhoto[]).map(
    (photo) => ({
      id: photo.id,
      url: getPublicUrl("guesthouse-images", photo.photo_path),
      altText: photo.alt_text ?? `${guesthouse.name} 사진`,
    }),
  );

  return {
    viewerProfile,
    detail: {
      jobPost: job,
      guesthouse: guesthouse as Guesthouse,
      imageUrl: mappedJobPhotos[0]?.url ?? mappedGuesthousePhotos[0]?.url ?? null,
      isFavorited: favoriteIds.has(job.guesthouse_id),
      jobPostPhotos: mappedJobPhotos,
      guesthousePhotos: mappedGuesthousePhotos,
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

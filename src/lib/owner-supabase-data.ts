import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  NEW_APPLICATION_STATUS,
  isNewApplicationStatus,
} from "@/lib/application-status";
import { getCurrentAuthUser } from "@/lib/auth/onboarding";
import { attachApplicationPhotoUrls } from "@/lib/application-photo";
import { closeExpiredOpenJobPosts } from "@/lib/job-post-expiration";
import type {
  Application,
  Guesthouse,
  GuesthousePhoto,
  JobPost,
  JobPostPhoto,
  Profile,
} from "@/types/database";

export interface OwnerDashboardData {
  owner: Profile;
  guesthouse: Guesthouse | null;
  current_job_post: JobPost | null;
  applications: Application[];
  stats: {
    total_application_count: number;
    new_application_count: number;
  };
}

function logSupabaseReadError(context: string, error: unknown) {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    console.error(`[owner-supabase-data] ${context}`, {
      message: record.message,
      code: record.code,
      details: record.details,
      hint: record.hint,
      name: record.name,
      cause: record.cause,
    });
    return;
  }

  console.error(`[owner-supabase-data] ${context}`, {
    message: String(error),
  });
}

export async function getCurrentOwner(): Promise<Profile> {
  try {
    const authUser = await getCurrentAuthUser();
    if (!authUser) {
      throw new Error("로그인이 필요합니다.");
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .eq("role", "owner")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error("사장님 프로필을 찾을 수 없습니다.");
    }

    return data as Profile;
  } catch (error) {
    logSupabaseReadError("failed to load current owner", error);
    throw new Error("사장님 정보를 불러오지 못했습니다.");
  }
}

export async function getOwnerGuesthouse(
  ownerId: string,
): Promise<Guesthouse | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("guesthouses")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return data as Guesthouse;
  } catch (error) {
    logSupabaseReadError("failed to load owner guesthouse", error);
    throw new Error("게스트하우스 정보를 불러오지 못했습니다.");
  }
}

export async function getCurrentJobPost(
  ownerId: string,
): Promise<JobPost | null> {
  const guesthouse = await getOwnerGuesthouse(ownerId);
  if (!guesthouse) return null;
  await closeExpiredOpenJobPosts({ ownerId, guesthouseId: guesthouse.id });

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("job_posts")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("guesthouse_id", guesthouse.id)
      .neq("status", "hidden")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return data as JobPost;
  } catch (error) {
    logSupabaseReadError("failed to load current job post", error);
    throw new Error("모집글 정보를 불러오지 못했습니다.");
  }
}

export async function getOwnerJobPostById(
  ownerId: string,
  jobPostId: string,
): Promise<JobPost | null> {
  await closeExpiredOpenJobPosts({ ownerId, jobPostId });

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("job_posts")
      .select("*")
      .eq("id", jobPostId)
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return data as JobPost;
  } catch (error) {
    logSupabaseReadError("failed to load owner job post by id", error);
    throw new Error("모집글 정보를 불러오지 못했습니다.");
  }
}

export async function getApplicationsByJobPostId(
  jobPostId: string,
): Promise<Application[]> {
  await closeExpiredOpenJobPosts({ jobPostId });

  try {
    const supabase = createSupabaseAdminClient();
    const { data: jobPost, error: jobPostError } = await supabase
      .from("job_posts")
      .select("recruitment_cycle, status")
      .eq("id", jobPostId)
      .maybeSingle();

    if (jobPostError) throw jobPostError;
    if (!jobPost) return [];
    if (jobPost.status === "hidden") return [];

    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("job_post_id", jobPostId)
      .eq("recruitment_cycle", jobPost.recruitment_cycle)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return attachApplicationPhotoUrls((data ?? []) as Application[]);
  } catch (error) {
    logSupabaseReadError("failed to load applications by job post id", error);
    throw new Error("지원자 목록을 불러오지 못했습니다.");
  }
}

export async function getApplicationCountByJobPostId(
  jobPostId: string,
): Promise<number> {
  await closeExpiredOpenJobPosts({ jobPostId });

  try {
    const supabase = createSupabaseAdminClient();
    const { data: jobPost, error: jobPostError } = await supabase
      .from("job_posts")
      .select("recruitment_cycle, status")
      .eq("id", jobPostId)
      .maybeSingle();

    if (jobPostError) throw jobPostError;
    if (!jobPost) return 0;
    if (jobPost.status === "hidden") return 0;

    const { count, error } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("job_post_id", jobPostId)
      .eq("recruitment_cycle", jobPost.recruitment_cycle)
      .neq("status", "canceled");

    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    logSupabaseReadError("failed to load application count by job post id", error);
    throw new Error("지원자 수를 불러오지 못했습니다.");
  }
}

export async function getOwnerNewApplicationCount(
  ownerId?: string,
): Promise<number> {
  const resolvedOwnerId = ownerId ?? (await getCurrentOwner()).id;
  const currentJobPost = await getCurrentJobPost(resolvedOwnerId);

  if (!currentJobPost) return 0;

  try {
    const supabase = createSupabaseAdminClient();
    const { count, error } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("job_post_id", currentJobPost.id)
      .eq("recruitment_cycle", currentJobPost.recruitment_cycle)
      .eq("status", NEW_APPLICATION_STATUS);

    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    logSupabaseReadError("failed to load owner new application count", error);
    throw new Error("신규 지원 수를 불러오지 못했습니다.");
  }
}

export async function getOwnerApplications(
  ownerId: string,
): Promise<Application[]> {
  const currentJobPost = await getCurrentJobPost(ownerId);
  if (!currentJobPost) return [];

  return getApplicationsByJobPostId(currentJobPost.id);
}

export async function getOwnerJobsPageData(): Promise<{
  owner: Profile;
  guesthouse: Guesthouse | null;
  currentJobPost: JobPost | null;
  applicationCount: number;
}> {
  const owner = await getCurrentOwner();
  const guesthouse = await getOwnerGuesthouse(owner.id);
  const currentJobPost = await getCurrentJobPost(owner.id);
  const applicationCount = currentJobPost
    ? await getApplicationCountByJobPostId(currentJobPost.id)
    : 0;

  return {
    owner,
    guesthouse,
    currentJobPost,
    applicationCount,
  };
}

export async function getApplicationWithOwnerCheck(
  applicationId: string,
): Promise<{ application: Application; job_post: JobPost } | null> {
  const owner = await getCurrentOwner();

  try {
    const supabase = createSupabaseAdminClient();
    const { data: application, error } = await supabase
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();

    if (error) throw error;
    if (!application) return null;

    const job_post = await getOwnerJobPostById(
      owner.id,
      application.job_post_id,
    );
    if (!job_post) return null;

    const [applicationWithPhotoUrl] = await attachApplicationPhotoUrls([
      application as Application,
    ]);

    return { application: applicationWithPhotoUrl, job_post };
  } catch (error) {
    logSupabaseReadError("failed to load application with owner check", error);
    throw new Error("지원서 정보를 불러오지 못했습니다.");
  }
}

export async function getGuesthouseById(
  guesthouseId: string,
): Promise<Guesthouse | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("guesthouses")
      .select("*")
      .eq("id", guesthouseId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return data as Guesthouse;
  } catch (error) {
    logSupabaseReadError("failed to load guesthouse by id", error);
    throw new Error("게스트하우스 정보를 불러오지 못했습니다.");
  }
}

export async function getGuesthousePhotos(
  guesthouseId: string,
): Promise<GuesthousePhoto[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("guesthouse_photos")
      .select("*")
      .eq("guesthouse_id", guesthouseId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []) as GuesthousePhoto[];
  } catch (error) {
    logSupabaseReadError("failed to load guesthouse photos", error);
    return [];
  }
}

export function getGuesthousePhotoPublicUrl(photoPath: string): string {
  const supabase = createSupabaseAdminClient();
  const { data } = supabase.storage
    .from("guesthouse-images")
    .getPublicUrl(photoPath);

  return data.publicUrl;
}

export async function getJobPostPhotos(
  jobPostId: string,
): Promise<JobPostPhoto[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("job_post_photos")
      .select("*")
      .eq("job_post_id", jobPostId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []) as JobPostPhoto[];
  } catch (error) {
    logSupabaseReadError("failed to load job post photos", error);
    return [];
  }
}

export function getJobPostPhotoPublicUrl(photoPath: string): string {
  const supabase = createSupabaseAdminClient();
  const { data } = supabase.storage
    .from("job-post-images")
    .getPublicUrl(photoPath);

  return data.publicUrl;
}

export async function getOwnerDashboardData(): Promise<OwnerDashboardData> {
  const owner = await getCurrentOwner();
  const guesthouse = await getOwnerGuesthouse(owner.id);
  const current_job_post = await getCurrentJobPost(owner.id);
  const applications = current_job_post
    ? await getApplicationsByJobPostId(current_job_post.id)
    : [];

  const activeApplications = applications.filter(
    (application) => application.status !== "canceled",
  );
  const new_application_count = activeApplications.filter((application) =>
    isNewApplicationStatus(application.status),
  ).length;

  return {
    owner,
    guesthouse,
    current_job_post,
    applications,
    stats: {
      total_application_count: activeApplications.length,
      new_application_count,
    },
  };
}

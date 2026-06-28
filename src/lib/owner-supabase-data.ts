import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentAuthUser } from "@/lib/auth/onboarding";
import { isUuid } from "@/lib/uuid";
import {
  currentOwner,
  getApplicationWithOwnerCheckMock,
  getApplicationsByJobPostIdMock,
  getCurrentJobPostMock,
  getGuesthouseByIdMock,
  getOwnerGuesthouseMock,
  getOwnerJobPostByIdMock,
  type OwnerDashboardData,
} from "@/lib/owner-data";
import type {
  Application,
  Guesthouse,
  GuesthousePhoto,
  JobPost,
  JobPostPhoto,
  Profile,
} from "@/types/database";

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

function logMockFallback(context: string, reason: string) {
  console.error(`[owner-supabase-data] using mock fallback: ${context}`, {
    reason,
  });
}

export async function getCurrentOwner(): Promise<Profile> {
  try {
    const authUser = await getCurrentAuthUser();
    if (authUser) {
      const supabase = createSupabaseAdminClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .eq("role", "owner")
        .maybeSingle();

      if (error) throw error;
      if (data) return data as Profile;

      logMockFallback(
        "current owner",
        `auth user id=${authUser.id}에 해당하는 owner profile이 없습니다.`,
      );
    }

    const supabase = createSupabaseAdminClient();
    const devOwnerId = process.env.NEXT_PUBLIC_DEV_OWNER_ID;
    const baseQuery = supabase.from("profiles").select("*").eq("role", "owner");

    const query = devOwnerId
      ? baseQuery.eq("id", devOwnerId)
      : baseQuery.order("created_at", { ascending: true }).limit(1);

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    if (!data) {
      logMockFallback(
        "current owner",
        devOwnerId
          ? `NEXT_PUBLIC_DEV_OWNER_ID=${devOwnerId}에 해당하는 owner profile이 없습니다.`
          : "role='owner' profile이 없습니다.",
      );
      return currentOwner;
    }

    return data as Profile;
  } catch (error) {
    logSupabaseReadError("failed to load current owner", error);
    logMockFallback("current owner", "Supabase owner profile 조회 실패");
    return currentOwner;
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
    if (!data) {
      logMockFallback(
        "owner guesthouse",
        `owner_id=${ownerId}에 해당하는 guesthouse가 없습니다.`,
      );
      return getOwnerGuesthouseMock(ownerId);
    }

    return data as Guesthouse;
  } catch (error) {
    logSupabaseReadError("failed to load owner guesthouse", error);
    logMockFallback(
      "owner guesthouse",
      `owner_id=${ownerId} guesthouse 조회 실패`,
    );
    return getOwnerGuesthouseMock(ownerId);
  }
}

export async function getCurrentJobPost(
  ownerId: string,
): Promise<JobPost | null> {
  const guesthouse = await getOwnerGuesthouse(ownerId);
  if (!guesthouse) return null;

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
    if (!data) {
      logMockFallback(
        "current job post",
        `owner_id=${ownerId}, guesthouse_id=${guesthouse.id}에 해당하는 job_post가 없습니다.`,
      );
      if (isUuid(ownerId) && isUuid(guesthouse.id)) return null;
      return getCurrentJobPostMock(ownerId);
    }

    return data as JobPost;
  } catch (error) {
    logSupabaseReadError("failed to load current job post", error);
    logMockFallback(
      "current job post",
      `owner_id=${ownerId} current job_post 조회 실패`,
    );
    return getCurrentJobPostMock(ownerId);
  }
}

export async function getOwnerJobPostById(
  ownerId: string,
  jobPostId: string,
): Promise<JobPost | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("job_posts")
      .select("*")
      .eq("id", jobPostId)
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      logMockFallback(
        "owner job post by id",
        `owner_id=${ownerId}, jobPostId=${jobPostId}에 해당하는 job_post가 없습니다.`,
      );
      return getOwnerJobPostByIdMock(ownerId, jobPostId);
    }

    return data as JobPost;
  } catch (error) {
    logSupabaseReadError("failed to load owner job post by id", error);
    logMockFallback(
      "owner job post by id",
      `owner_id=${ownerId}, jobPostId=${jobPostId} job_post 조회 실패`,
    );
    return getOwnerJobPostByIdMock(ownerId, jobPostId);
  }
}

export async function getApplicationsByJobPostId(
  jobPostId: string,
): Promise<Application[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: jobPost, error: jobPostError } = await supabase
      .from("job_posts")
      .select("recruitment_cycle, status")
      .eq("id", jobPostId)
      .maybeSingle();

    if (jobPostError) throw jobPostError;
    if (!jobPost) {
      logMockFallback(
        "applications by job post id",
        `jobPostId=${jobPostId}에 해당하는 job_post가 없어 recruitment_cycle을 확인할 수 없습니다.`,
      );
      return getApplicationsByJobPostIdMock(jobPostId);
    }
    if (jobPost.status === "hidden") return [];

    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("job_post_id", jobPostId)
      .eq("recruitment_cycle", jobPost.recruitment_cycle)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as Application[];
  } catch (error) {
    logSupabaseReadError("failed to load applications by job post id", error);
    logMockFallback(
      "applications by job post id",
      `jobPostId=${jobPostId} applications 조회 실패`,
    );
    return getApplicationsByJobPostIdMock(jobPostId);
  }
}

export async function getApplicationCountByJobPostId(
  jobPostId: string,
): Promise<number> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: jobPost, error: jobPostError } = await supabase
      .from("job_posts")
      .select("recruitment_cycle, status")
      .eq("id", jobPostId)
      .maybeSingle();

    if (jobPostError) throw jobPostError;
    if (!jobPost) {
      logMockFallback(
        "application count by job post id",
        `jobPostId=${jobPostId}에 해당하는 job_post가 없어 지원자 수를 0으로 표시합니다.`,
      );
      return 0;
    }
    if (jobPost.status === "hidden") return 0;

    const { count, error } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("job_post_id", jobPostId)
      .eq("recruitment_cycle", jobPost.recruitment_cycle);

    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    logSupabaseReadError("failed to load application count by job post id", error);
    logMockFallback(
      "application count by job post id",
      `jobPostId=${jobPostId} 지원자 수 조회 실패로 0을 표시합니다.`,
    );
    return 0;
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

    return { application: application as Application, job_post };
  } catch (error) {
    logSupabaseReadError("failed to load application with owner check", error);
    logMockFallback(
      "application with owner check",
      `applicationId=${applicationId} 지원서 조회 실패`,
    );
    return getApplicationWithOwnerCheckMock(owner.id, applicationId);
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
    if (!data) {
      logMockFallback(
        "guesthouse by id",
        `guesthouseId=${guesthouseId}에 해당하는 guesthouse가 없습니다.`,
      );
      return getGuesthouseByIdMock(guesthouseId);
    }

    return data as Guesthouse;
  } catch (error) {
    logSupabaseReadError("failed to load guesthouse by id", error);
    logMockFallback(
      "guesthouse by id",
      `guesthouseId=${guesthouseId} guesthouse 조회 실패`,
    );
    return getGuesthouseByIdMock(guesthouseId);
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

  const new_application_count = applications.filter(
    (a) => a.status === "submitted",
  ).length;

  return {
    owner,
    guesthouse,
    current_job_post,
    applications,
    stats: {
      total_application_count: applications.length,
      new_application_count,
    },
  };
}

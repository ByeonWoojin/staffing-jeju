import { createSupabaseServerClient } from "@/lib/supabase/client";
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
import type { Application, Guesthouse, JobPost, Profile } from "@/types/database";

function logSupabaseReadError(context: string, error: unknown) {
  console.error(`[owner-supabase-data] ${context}`, error);
}

export async function getCurrentOwner(): Promise<Profile> {
  try {
    const supabase = createSupabaseServerClient();
    let query = supabase
      .from("profiles")
      .select("*")
      .eq("role", "owner")
      .order("created_at", { ascending: true })
      .limit(1);

    if (process.env.NEXT_PUBLIC_DEV_OWNER_ID) {
      query = query.eq("id", process.env.NEXT_PUBLIC_DEV_OWNER_ID);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return (data as Profile | null) ?? currentOwner;
  } catch (error) {
    logSupabaseReadError("failed to load current owner", error);
    return currentOwner;
  }
}

export async function getOwnerGuesthouse(
  ownerId: string,
): Promise<Guesthouse | null> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("guesthouses")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as Guesthouse | null;
  } catch (error) {
    logSupabaseReadError("failed to load owner guesthouse", error);
    return getOwnerGuesthouseMock(ownerId);
  }
}

export async function getCurrentJobPost(
  ownerId: string,
): Promise<JobPost | null> {
  const guesthouse = await getOwnerGuesthouse(ownerId);
  if (!guesthouse) return null;

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("job_posts")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("guesthouse_id", guesthouse.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as JobPost | null;
  } catch (error) {
    logSupabaseReadError("failed to load current job post", error);
    return getCurrentJobPostMock(ownerId);
  }
}

export async function getOwnerJobPostById(
  ownerId: string,
  jobPostId: string,
): Promise<JobPost | null> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("job_posts")
      .select("*")
      .eq("id", jobPostId)
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (error) throw error;
    return data as JobPost | null;
  } catch (error) {
    logSupabaseReadError("failed to load owner job post by id", error);
    return getOwnerJobPostByIdMock(ownerId, jobPostId);
  }
}

export async function getApplicationsByJobPostId(
  jobPostId: string,
): Promise<Application[]> {
  try {
    const supabase = createSupabaseServerClient();
    const { data: jobPost, error: jobPostError } = await supabase
      .from("job_posts")
      .select("recruitment_cycle")
      .eq("id", jobPostId)
      .maybeSingle();

    if (jobPostError) throw jobPostError;
    if (!jobPost) return [];

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
    return getApplicationsByJobPostIdMock(jobPostId);
  }
}

export async function getOwnerApplications(
  ownerId: string,
): Promise<Application[]> {
  const currentJobPost = await getCurrentJobPost(ownerId);
  if (!currentJobPost) return [];

  return getApplicationsByJobPostId(currentJobPost.id);
}

export async function getApplicationWithOwnerCheck(
  applicationId: string,
): Promise<{ application: Application; job_post: JobPost } | null> {
  const owner = await getCurrentOwner();

  try {
    const supabase = createSupabaseServerClient();
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
    return getApplicationWithOwnerCheckMock(owner.id, applicationId);
  }
}

export async function getGuesthouseById(
  guesthouseId: string,
): Promise<Guesthouse | null> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("guesthouses")
      .select("*")
      .eq("id", guesthouseId)
      .maybeSingle();

    if (error) throw error;
    return data as Guesthouse | null;
  } catch (error) {
    logSupabaseReadError("failed to load guesthouse by id", error);
    return getGuesthouseByIdMock(guesthouseId);
  }
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

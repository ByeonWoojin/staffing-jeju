import "server-only";

import { redirect } from "next/navigation";
import { attachApplicationPhotoUrls } from "@/lib/application-photo";
import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Application, Guesthouse, JobPost, Profile } from "@/types/database";

export interface StaffApplicationItem {
  application: Application & { representativePhotoUrl?: string | null };
  jobPost: JobPost | null;
  guesthouse: Guesthouse | null;
}

export interface StaffApplicationsData {
  profile: Profile;
  authorized: boolean;
  items: StaffApplicationItem[];
}

export async function getStaffApplicationsData(): Promise<StaffApplicationsData> {
  const user = await getCurrentAuthUser();
  if (!user) redirect("/");

  const profile = await getProfileById(user.id);
  if (!profile) redirect("/onboarding/role");
  if (profile.role !== "staff") {
    return { profile, authorized: false, items: [] };
  }

  const supabase = createSupabaseAdminClient();
  const { data: applications, error: applicationError } = await supabase
    .from("applications")
    .select("*")
    .eq("staff_id", profile.id)
    .order("created_at", { ascending: false });

  if (applicationError) {
    console.error("[staff-application-data] applications lookup failed", {
      staffId: profile.id,
      message: applicationError.message,
      code: applicationError.code,
      details: applicationError.details,
    });
    return { profile, authorized: true, items: [] };
  }

  const applicationsWithPhotoUrl = await attachApplicationPhotoUrls(
    (applications ?? []) as Application[],
  );
  if (applicationsWithPhotoUrl.length === 0) {
    return { profile, authorized: true, items: [] };
  }

  const jobPostIds = [
    ...new Set(applicationsWithPhotoUrl.map((application) => application.job_post_id)),
  ];
  const { data: jobPosts, error: jobPostError } = await supabase
    .from("job_posts")
    .select("*")
    .in("id", jobPostIds);

  if (jobPostError) {
    console.error("[staff-application-data] job posts lookup failed", {
      message: jobPostError.message,
      code: jobPostError.code,
      details: jobPostError.details,
    });
  }

  const jobPostById = new Map(
    ((jobPosts ?? []) as JobPost[]).map((jobPost) => [jobPost.id, jobPost]),
  );
  const guesthouseIds = [
    ...new Set(
      [...jobPostById.values()].map((jobPost) => jobPost.guesthouse_id),
    ),
  ];

  const { data: guesthouses, error: guesthouseError } = guesthouseIds.length
    ? await supabase.from("guesthouses").select("*").in("id", guesthouseIds)
    : { data: [], error: null };

  if (guesthouseError) {
    console.error("[staff-application-data] guesthouses lookup failed", {
      message: guesthouseError.message,
      code: guesthouseError.code,
      details: guesthouseError.details,
    });
  }

  const guesthouseById = new Map(
    ((guesthouses ?? []) as Guesthouse[]).map((guesthouse) => [
      guesthouse.id,
      guesthouse,
    ]),
  );

  return {
    profile,
    authorized: true,
    items: applicationsWithPhotoUrl.map((application) => {
      const jobPost = jobPostById.get(application.job_post_id) ?? null;

      return {
        application,
        jobPost,
        guesthouse: jobPost ? guesthouseById.get(jobPost.guesthouse_id) ?? null : null,
      };
    }),
  };
}

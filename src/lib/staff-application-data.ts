import "server-only";

import { redirect } from "next/navigation";
import { attachApplicationPhotoUrls } from "@/lib/application-photo";
import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import { convertExpiredOpenJobPostsToAsap } from "@/lib/job-post-asap-expiration";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  STAFF_APPLICATION_STATUS_NOTICE_STATUSES,
  type ApplicationStatusSummary,
} from "@/lib/application-status";
import type {
  Application,
  ApplicationStatus,
  Guesthouse,
  JobPost,
  Profile,
} from "@/types/database";

export interface StaffApplicationItem {
  application: Application & { representativePhotoUrl?: string | null };
  jobPost: JobPost | null;
  guesthouse: Guesthouse | null;
  statusChangedAt: string | null;
}

export interface StaffApplicationsData {
  profile: Profile;
  authorized: boolean;
  items: StaffApplicationItem[];
}

type StatusLogRow = {
  application_id: string;
  to_status: ApplicationStatus;
  created_at: string;
};

async function getLatestStatusChangeByApplicationId(
  applicationIds: string[],
): Promise<Map<string, StatusLogRow>> {
  if (applicationIds.length === 0) return new Map();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("application_status_logs")
    .select("application_id, to_status, created_at")
    .in("application_id", applicationIds)
    .in("to_status", [...STAFF_APPLICATION_STATUS_NOTICE_STATUSES])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[staff-application-data] status logs lookup failed", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return new Map();
  }

  return ((data ?? []) as StatusLogRow[]).reduce<Map<string, StatusLogRow>>(
    (latestByApplicationId, log) => {
      if (!latestByApplicationId.has(log.application_id)) {
        latestByApplicationId.set(log.application_id, log);
      }
      return latestByApplicationId;
    },
    new Map(),
  );
}

function buildApplicationStatusSummary({
  application,
  statusLog,
}: {
  application: Pick<Application, "id" | "status">;
  statusLog?: StatusLogRow;
}): ApplicationStatusSummary {
  return {
    applicationId: application.id,
    status: application.status,
    statusChangedAt:
      statusLog?.to_status === application.status ? statusLog.created_at : null,
  };
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

  const applicationIds = applicationsWithPhotoUrl.map(
    (application) => application.id,
  );
  const jobPostIds = [
    ...new Set(
      applicationsWithPhotoUrl.map((application) => application.job_post_id),
    ),
  ];
  await convertExpiredOpenJobPostsToAsap({ jobPostIds });

  const [
    { data: jobPosts, error: jobPostError },
    latestStatusChangeByApplicationId,
  ] = await Promise.all([
    supabase.from("job_posts").select("*").in("id", jobPostIds),
    getLatestStatusChangeByApplicationId(applicationIds),
  ]);

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
      const latestStatusChange = latestStatusChangeByApplicationId.get(
        application.id,
      );

      return {
        application,
        jobPost,
        guesthouse: jobPost
          ? guesthouseById.get(jobPost.guesthouse_id) ?? null
          : null,
        statusChangedAt:
          latestStatusChange?.to_status === application.status
            ? latestStatusChange.created_at
            : null,
      };
    }),
  };
}

export async function getStaffApplicationStatusSummary(): Promise<{
  staffId: string | null;
  summaries: ApplicationStatusSummary[];
}> {
  const user = await getCurrentAuthUser();
  if (!user) return { staffId: null, summaries: [] };

  const profile = await getProfileById(user.id);
  if (!profile || profile.role !== "staff") {
    return { staffId: null, summaries: [] };
  }

  const supabase = createSupabaseAdminClient();
  const { data: applications, error } = await supabase
    .from("applications")
    .select("id, status, job_post_id")
    .eq("staff_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[staff-application-data] status summary lookup failed", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return { staffId: profile.id, summaries: [] };
  }

  const applicationRows = (applications ?? []) as Pick<
    Application,
    "id" | "status" | "job_post_id"
  >[];
  if (applicationRows.length === 0) {
    return { staffId: profile.id, summaries: [] };
  }

  const applicationIds = applicationRows.map((application) => application.id);
  const jobPostIds = [
    ...new Set(applicationRows.map((application) => application.job_post_id)),
  ];
  await convertExpiredOpenJobPostsToAsap({ jobPostIds });

  const [
    { data: jobPosts, error: jobPostError },
    latestStatusChangeByApplicationId,
  ] = await Promise.all([
    supabase.from("job_posts").select("id").in("id", jobPostIds),
    getLatestStatusChangeByApplicationId(applicationIds),
  ]);

  if (jobPostError) {
    console.error("[staff-application-data] status summary job posts failed", {
      message: jobPostError.message,
      code: jobPostError.code,
      details: jobPostError.details,
    });
    return { staffId: profile.id, summaries: [] };
  }

  const availableJobPostIds = new Set(
    ((jobPosts ?? []) as Pick<JobPost, "id">[]).map((jobPost) => jobPost.id),
  );

  return {
    staffId: profile.id,
    summaries: applicationRows
      .filter((application) => availableJobPostIds.has(application.job_post_id))
      .map((application) =>
        buildApplicationStatusSummary({
          application,
          statusLog: latestStatusChangeByApplicationId.get(application.id),
        }),
      ),
  };
}

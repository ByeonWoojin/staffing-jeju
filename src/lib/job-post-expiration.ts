import "server-only";

import {
  getTodayDateStringInKorea,
  isPastDateInKorea,
} from "@/lib/job-post-date-validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { JobPost } from "@/types/database";

type ExpiredJobPostScope = {
  jobPostId?: string;
  jobPostIds?: string[];
  ownerId?: string;
  guesthouseId?: string;
  guesthouseIds?: string[];
  slug?: string;
};

function serializeSupabaseError(error: unknown) {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return {
      message: record.message,
      code: record.code,
      details: record.details,
      hint: record.hint,
    };
  }

  return { message: String(error) };
}

function uniqueValues(values: string[] | undefined) {
  return [...new Set(values?.filter(Boolean) ?? [])];
}

export function isJobPostExpiredByWorkStartDate(
  jobPost: Pick<JobPost, "status" | "work_start_date">,
  todayInKorea?: string,
): boolean {
  return (
    jobPost.status === "open" &&
    isPastDateInKorea(jobPost.work_start_date, todayInKorea)
  );
}

export async function closeExpiredOpenJobPosts(
  scope: ExpiredJobPostScope = {},
): Promise<JobPost[]> {
  const jobPostIds = uniqueValues(scope.jobPostIds);
  const guesthouseIds = uniqueValues(scope.guesthouseIds);

  if (
    (scope.jobPostIds && jobPostIds.length === 0) ||
    (scope.guesthouseIds && guesthouseIds.length === 0)
  ) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const todayInKorea = getTodayDateStringInKorea();
  let query = supabase
    .from("job_posts")
    .update({ status: "closed" })
    .eq("status", "open")
    .lt("work_start_date", todayInKorea)
    .select("*");

  if (scope.jobPostId) {
    query = query.eq("id", scope.jobPostId);
  }
  if (jobPostIds.length > 0) {
    query = query.in("id", jobPostIds);
  }
  if (scope.ownerId) {
    query = query.eq("owner_id", scope.ownerId);
  }
  if (scope.guesthouseId) {
    query = query.eq("guesthouse_id", scope.guesthouseId);
  }
  if (guesthouseIds.length > 0) {
    query = query.in("guesthouse_id", guesthouseIds);
  }
  if (scope.slug) {
    query = query.eq("slug", scope.slug);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[job-post-expiration] failed to close expired job posts", {
      scope,
      error: serializeSupabaseError(error),
    });
    throw new Error("만료된 모집글 마감 처리에 실패했습니다.");
  }

  return (data ?? []) as JobPost[];
}

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import {
  isPastDateInKorea,
  normalizeRequiredDateString,
  WORK_START_DATE_REOPEN_PAST_ERROR_MESSAGE,
} from "@/lib/job-post-date-validation";
import { isUuid } from "@/lib/uuid";
import type { JobPost, Profile } from "@/types/database";

const BUMP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const URGENT_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
const INVALID_JOB_POST_ID_MESSAGE =
  "개발용 mock 데이터에서는 액션을 실행할 수 없습니다. Supabase job_posts.id UUID를 사용해야 합니다.";

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

function logAction(
  actionName: string,
  jobPostId: string,
  payload: Record<string, unknown>,
) {
  void actionName;
  void jobPostId;
  void payload;
}

function assertValidJobPostId(jobPostId: string) {
  if (!isUuid(jobPostId)) {
    throw new Error(INVALID_JOB_POST_ID_MESSAGE);
  }
}

function logUuidValidation(actionName: string, jobPostId: string) {
  void actionName;
  void jobPostId;
}

function revalidateOwnerRecruitmentPaths(jobPostId?: string) {
  revalidatePath("/owner");
  revalidatePath("/owner/jobs");
  revalidatePath("/owner/applications");
  revalidatePath("/onboarding/owner/job-post");

  if (jobPostId) {
    revalidatePath(`/owner/jobs/${jobPostId}/applications`);
    revalidatePath(`/owner/jobs/${jobPostId}/edit`);
  }
}

async function getCurrentOwnerProfileOrThrow(): Promise<Profile> {
  const user = await getCurrentAuthUser();
  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const profile = await getProfileById(user.id);
  if (!profile || profile.role !== "owner") {
    throw new Error("사장님 계정만 실행할 수 있는 작업입니다.");
  }

  return profile;
}

async function getJobPostOrThrow(jobPostId: string): Promise<JobPost> {
  assertValidJobPostId(jobPostId);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("job_posts")
    .select("*")
    .eq("id", jobPostId)
    .maybeSingle();

  if (error) {
    logAction("getJobPostOrThrow:error", jobPostId, {
      error: serializeSupabaseError(error),
    });
    throw new Error(`모집글 조회에 실패했습니다: ${error.message}`);
  }
  if (!data) {
    logAction("getJobPostOrThrow:no-row", jobPostId, {});
    throw new Error("모집글을 찾을 수 없습니다.");
  }

  logAction("getJobPostOrThrow:success", jobPostId, { result: data });
  return data as JobPost;
}

async function updateJobPostOrThrow(
  actionName: string,
  jobPostId: string,
  ownerId: string,
  values: Partial<JobPost>,
): Promise<JobPost> {
  assertValidJobPostId(jobPostId);

  const supabase = createSupabaseAdminClient();
  logAction(`${actionName}:update:start`, jobPostId, { values });

  const { data, error } = await supabase
    .from("job_posts")
    .update(values)
    .eq("id", jobPostId)
    .eq("owner_id", ownerId)
    .select("*")
    .maybeSingle();

  if (error) {
    logAction(`${actionName}:update:error`, jobPostId, {
      error: serializeSupabaseError(error),
    });
    throw new Error(`모집글 변경에 실패했습니다: ${error.message}`);
  }
  if (!data) {
    logAction(`${actionName}:update:no-row`, jobPostId, { values });
    throw new Error("모집글 변경 결과가 없습니다. DB row가 수정되지 않았습니다.");
  }

  logAction(`${actionName}:update:success`, jobPostId, { result: data });
  return data as JobPost;
}

function assertOwnerCanManageJobPost(
  actionName: string,
  jobPostId: string,
  owner: Profile,
  jobPost: JobPost,
) {
  logAction(`${actionName}:owner-check`, jobPostId, {
    currentOwnerId: owner.id,
    jobPostOwnerId: jobPost.owner_id,
  });

  if (jobPost.owner_id !== owner.id) {
    logAction(`${actionName}:owner:error`, jobPostId, {
      currentOwnerId: owner.id,
      jobPostOwnerId: jobPost.owner_id,
    });
    throw new Error("현재 사장님이 관리할 수 있는 모집글이 아닙니다.");
  }
}

export async function closeRecruitment(jobPostId: string): Promise<JobPost> {
  logUuidValidation("closeRecruitment", jobPostId);
  const owner = await getCurrentOwnerProfileOrThrow();
  const current = await getJobPostOrThrow(jobPostId);

  logAction("closeRecruitment:owner-check", jobPostId, {
    currentOwnerId: owner.id,
    jobPostOwnerId: current.owner_id,
  });

  if (current.owner_id !== owner.id) {
    logAction("closeRecruitment:owner:error", jobPostId, {
      currentOwnerId: owner.id,
      jobPostOwnerId: current.owner_id,
    });
    throw new Error("현재 사장님이 관리할 수 있는 모집글이 아닙니다.");
  }
  if (current.status === "hidden") {
    throw new Error("숨김 처리된 모집글은 마감할 수 없습니다.");
  }
  if (current.status === "closed") {
    revalidateOwnerRecruitmentPaths(jobPostId);
    logAction("closeRecruitment:already-closed", jobPostId, {
      existingRow: current,
    });
    return current;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("job_posts")
    .update({ status: "closed" })
    .eq("id", jobPostId)
    .eq("owner_id", owner.id)
    .neq("status", "hidden")
    .select("*")
    .maybeSingle();

  if (error) {
    logAction("closeRecruitment:update:error", jobPostId, {
      error: serializeSupabaseError(error),
    });
    throw new Error(`모집 마감 처리에 실패했습니다: ${error.message}`);
  }
  if (!data) {
    logAction("closeRecruitment:update:no-row", jobPostId, {});
    throw new Error("모집 마감 처리 결과가 없습니다.");
  }

  const updated = data as JobPost;

  if (updated.status !== "closed") {
    logAction("closeRecruitment:verify:error", jobPostId, { result: updated });
    throw new Error("모집 마감 처리 후 DB 상태가 closed가 아닙니다.");
  }

  revalidateOwnerRecruitmentPaths(jobPostId);
  logAction("closeRecruitment:done", jobPostId, {
    before: current,
    result: updated,
  });
  return updated;
}

export async function reopenRecruitment(jobPostId: string): Promise<JobPost> {
  logUuidValidation("reopenRecruitment", jobPostId);
  const owner = await getCurrentOwnerProfileOrThrow();
  const current = await getJobPostOrThrow(jobPostId);
  assertOwnerCanManageJobPost("reopenRecruitment", jobPostId, owner, current);

  const workStartDate = normalizeRequiredDateString(
    current.work_start_date,
    "근무 시작일",
  );
  if (isPastDateInKorea(workStartDate)) {
    throw new Error(WORK_START_DATE_REOPEN_PAST_ERROR_MESSAGE);
  }

  const nextRecruitmentCycle =
    current.status === "closed"
      ? current.recruitment_cycle + 1
      : current.recruitment_cycle;

  const updated = await updateJobPostOrThrow(
    "reopenRecruitment",
    jobPostId,
    owner.id,
    {
      status: "open",
      recruitment_cycle: nextRecruitmentCycle,
    },
  );

  if (
    updated.status !== "open" ||
    updated.recruitment_cycle !== nextRecruitmentCycle
  ) {
    logAction("reopenRecruitment:verify:error", jobPostId, {
      before: current,
      expectedRecruitmentCycle: nextRecruitmentCycle,
      result: updated,
    });
    throw new Error("모집 재개 처리 후 DB 상태 검증에 실패했습니다.");
  }

  revalidateOwnerRecruitmentPaths(jobPostId);
  logAction("reopenRecruitment:done", jobPostId, {
    before: current,
    result: updated,
  });
  return updated;
}

export async function bumpRecruitment(jobPostId: string): Promise<JobPost> {
  logUuidValidation("bumpRecruitment", jobPostId);
  const owner = await getCurrentOwnerProfileOrThrow();
  const current = await getJobPostOrThrow(jobPostId);
  assertOwnerCanManageJobPost("bumpRecruitment", jobPostId, owner, current);

  if (current.status !== "open") {
    logAction("bumpRecruitment:status:error", jobPostId, {
      status: current.status,
    });
    throw new Error("모집중 상태에서만 끌어올릴 수 있습니다.");
  }

  if (current.last_bumped_at) {
    const lastBumpedAt = new Date(current.last_bumped_at).getTime();
    const nextAvailableAt = lastBumpedAt + BUMP_INTERVAL_MS;

    if (Date.now() < nextAvailableAt) {
      logAction("bumpRecruitment:interval:error", jobPostId, {
        last_bumped_at: current.last_bumped_at,
        nextAvailableAt: new Date(nextAvailableAt).toISOString(),
      });
      throw new Error("끌어올리기는 24시간에 1회만 가능합니다.");
    }
  }

  const now = new Date().toISOString();
  const nextBumpCount = current.bump_count + 1;
  const updated = await updateJobPostOrThrow(
    "bumpRecruitment",
    jobPostId,
    owner.id,
    {
      bumped_at: now,
      last_bumped_at: now,
      bump_count: nextBumpCount,
    },
  );

  if (
    updated.bump_count !== nextBumpCount ||
    !updated.bumped_at ||
    !updated.last_bumped_at
  ) {
    logAction("bumpRecruitment:verify:error", jobPostId, {
      before: current,
      expectedBumpCount: nextBumpCount,
      result: updated,
    });
    throw new Error("끌어올리기 처리 후 DB 상태 검증에 실패했습니다.");
  }

  revalidatePath("/owner");
  revalidatePath("/owner/jobs");
  revalidatePath(`/owner/jobs/${jobPostId}/applications`);

  logAction("bumpRecruitment:done", jobPostId, {
    before: current,
    result: updated,
  });
  return updated;
}

export async function markUrgentRecruitment(
  jobPostId: string,
): Promise<JobPost> {
  logUuidValidation("markUrgentRecruitment", jobPostId);
  const owner = await getCurrentOwnerProfileOrThrow();
  const current = await getJobPostOrThrow(jobPostId);
  assertOwnerCanManageJobPost(
    "markUrgentRecruitment",
    jobPostId,
    owner,
    current,
  );

  if (current.status !== "open") {
    logAction("markUrgentRecruitment:status:error", jobPostId, {
      existingRow: current,
      status: current.status,
    });
    throw new Error("모집중 상태에서만 급구 처리할 수 있습니다.");
  }

  if (current.last_urgent_marked_at) {
    const lastUrgentMarkedAt = new Date(
      current.last_urgent_marked_at,
    ).getTime();
    const nextAvailableAt = lastUrgentMarkedAt + URGENT_INTERVAL_MS;

    if (Date.now() < nextAvailableAt) {
      logAction("markUrgentRecruitment:interval:error", jobPostId, {
        existingRow: current,
        last_urgent_marked_at: current.last_urgent_marked_at,
        nextAvailableAt: new Date(nextAvailableAt).toISOString(),
      });
      throw new Error("급구 처리는 한 달에 한 번만 가능합니다.");
    }
  }

  const now = new Date().toISOString();
  const updated = await updateJobPostOrThrow(
    "markUrgentRecruitment",
    jobPostId,
    owner.id,
    {
      is_urgent: true,
      last_urgent_marked_at: now,
    },
  );

  if (updated.is_urgent !== true || !updated.last_urgent_marked_at) {
    logAction("markUrgentRecruitment:verify:error", jobPostId, {
      before: current,
      result: updated,
    });
    throw new Error("급구 처리 후 DB 상태 검증에 실패했습니다.");
  }

  revalidatePath("/owner");
  revalidatePath("/owner/jobs");

  logAction("markUrgentRecruitment:done", jobPostId, {
    before: current,
    result: updated,
  });
  return updated;
}

export async function hideRecruitment(jobPostId: string): Promise<JobPost> {
  logUuidValidation("hideRecruitment", jobPostId);
  assertValidJobPostId(jobPostId);

  const owner = await getCurrentOwnerProfileOrThrow();
  const current = await getJobPostOrThrow(jobPostId);

  if (current.owner_id !== owner.id) {
    logAction("hideRecruitment:owner:error", jobPostId, {
      ownerId: owner.id,
      jobPostOwnerId: current.owner_id,
    });
    throw new Error("현재 owner가 삭제할 수 있는 모집글이 아닙니다.");
  }

  if (current.status === "hidden") {
    revalidateOwnerRecruitmentPaths(jobPostId);
    logAction("hideRecruitment:already-hidden", jobPostId, {
      existingRow: current,
    });
    return current;
  }

  const updated = await updateJobPostOrThrow(
    "hideRecruitment",
    jobPostId,
    owner.id,
    {
      status: "hidden",
    },
  );

  if (updated.status !== "hidden") {
    logAction("hideRecruitment:verify:error", jobPostId, {
      before: current,
      result: updated,
    });
    throw new Error("모집글 삭제 처리 후 DB 상태가 hidden이 아닙니다.");
  }

  revalidateOwnerRecruitmentPaths(jobPostId);
  logAction("hideRecruitment:done", jobPostId, {
    before: current,
    result: updated,
  });
  return updated;
}

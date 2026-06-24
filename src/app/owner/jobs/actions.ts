"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/uuid";
import type { JobPost } from "@/types/database";

const BUMP_INTERVAL_MS = 24 * 60 * 60 * 1000;
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
  console.log(`[owner/jobs/actions] ${actionName}`, {
    jobPostId,
    ...payload,
  });
}

function assertValidJobPostId(jobPostId: string) {
  if (!isUuid(jobPostId)) {
    throw new Error(INVALID_JOB_POST_ID_MESSAGE);
  }
}

function logUuidValidation(actionName: string, jobPostId: string) {
  console.log(`[${actionName}] uuid validation`, {
    jobPostId,
    isValidUuid: isUuid(jobPostId),
  });
}

function revalidateOwnerRecruitmentPaths(jobPostId?: string) {
  revalidatePath("/owner");
  revalidatePath("/owner/jobs");
  revalidatePath("/owner/applications");

  if (jobPostId) {
    revalidatePath(`/owner/jobs/${jobPostId}/applications`);
    revalidatePath(`/owner/jobs/${jobPostId}/edit`);
  }
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
  values: Partial<JobPost>,
): Promise<JobPost> {
  assertValidJobPostId(jobPostId);

  const supabase = createSupabaseAdminClient();
  logAction(`${actionName}:update:start`, jobPostId, { values });

  const { data, error } = await supabase
    .from("job_posts")
    .update(values)
    .eq("id", jobPostId)
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

export async function closeRecruitment(jobPostId: string): Promise<JobPost> {
  console.log("[closeRecruitment] called", jobPostId);
  logUuidValidation("closeRecruitment", jobPostId);
  const current = await getJobPostOrThrow(jobPostId);

  const updated = await updateJobPostOrThrow("closeRecruitment", jobPostId, {
    status: "closed",
  });

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
  console.log("[reopenRecruitment] called", jobPostId);
  logUuidValidation("reopenRecruitment", jobPostId);
  const current = await getJobPostOrThrow(jobPostId);
  const nextRecruitmentCycle =
    current.status === "closed"
      ? current.recruitment_cycle + 1
      : current.recruitment_cycle;

  const updated = await updateJobPostOrThrow(
    "reopenRecruitment",
    jobPostId,
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
  console.log("[bumpRecruitment] called", jobPostId);
  logUuidValidation("bumpRecruitment", jobPostId);
  const current = await getJobPostOrThrow(jobPostId);

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
  const updated = await updateJobPostOrThrow("bumpRecruitment", jobPostId, {
    bumped_at: now,
    last_bumped_at: now,
    bump_count: nextBumpCount,
  });

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

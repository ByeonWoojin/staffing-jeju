"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import { isUuid } from "@/lib/uuid";
import type {
  Application,
  ApplicationStatus,
  JobPost,
  Profile,
} from "@/types/database";

const INVALID_APPLICATION_ID_MESSAGE =
  "개발용 mock 데이터에서는 지원자 상태를 변경할 수 없습니다. Supabase applications.id UUID를 사용해야 합니다.";

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
  applicationId: string,
  payload: Record<string, unknown>,
) {
  console.log(`[owner/applications/actions] ${actionName}`, {
    applicationId,
    ...payload,
  });
}

function assertValidApplicationId(applicationId: string) {
  if (!isUuid(applicationId)) {
    throw new Error(INVALID_APPLICATION_ID_MESSAGE);
  }
}

function logUuidValidation(actionName: string, applicationId: string) {
  console.log(`[${actionName}] uuid validation`, {
    applicationId,
    isValidUuid: isUuid(applicationId),
  });
}

async function getCurrentOwnerOrThrow(): Promise<Profile> {
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

async function getApplicationOrThrow(
  applicationId: string,
): Promise<Application> {
  assertValidApplicationId(applicationId);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();

  if (error) {
    logAction("getApplicationOrThrow:error", applicationId, {
      error: serializeSupabaseError(error),
    });
    throw new Error(`지원서 조회에 실패했습니다: ${error.message}`);
  }
  if (!data) {
    logAction("getApplicationOrThrow:no-row", applicationId, {});
    throw new Error("지원서를 찾을 수 없습니다.");
  }

  logAction("getApplicationOrThrow:success", applicationId, { result: data });
  return data as Application;
}

async function insertApplicationStatusLogOrThrow({
  applicationId,
  changedBy,
  fromStatus,
  toStatus,
  memo,
}: {
  applicationId: string;
  changedBy: string;
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
  memo: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("application_status_logs")
    .insert({
      application_id: applicationId,
      changed_by: changedBy,
      from_status: fromStatus,
      to_status: toStatus,
      memo,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    logAction("insertApplicationStatusLog:error", applicationId, {
      error: serializeSupabaseError(error),
      fromStatus,
      toStatus,
      changedBy,
      memo,
    });
    throw new Error(`지원 상태 로그 기록에 실패했습니다: ${error.message}`);
  }
  if (!data) {
    logAction("insertApplicationStatusLog:no-row", applicationId, {
      fromStatus,
      toStatus,
      changedBy,
      memo,
    });
    throw new Error("지원 상태 로그 기록 결과가 없습니다.");
  }

  logAction("insertApplicationStatusLog:success", applicationId, {
    result: data,
  });
}

async function updateApplicationStatusOrThrow({
  actionName,
  applicationId,
  toStatus,
  allowedFromStatuses,
  memo,
  shouldRevalidate = true,
}: {
  actionName: string;
  applicationId: string;
  toStatus: ApplicationStatus;
  allowedFromStatuses: ApplicationStatus[];
  memo: string;
  shouldRevalidate?: boolean;
}): Promise<{
  application: Application;
  jobPost: JobPost;
  owner: Profile;
}> {
  console.log(`[${actionName}] called`, applicationId);
  logUuidValidation(actionName, applicationId);

  const current = await getApplicationOrThrow(applicationId);
  const owner = await getCurrentOwnerOrThrow();
  const jobPost = await getJobPostOrThrow(current.job_post_id);

  logAction(`${actionName}:owner-check`, applicationId, {
    jobPostId: current.job_post_id,
    currentOwnerId: owner.id,
    jobPostOwnerId: jobPost.owner_id,
  });

  if (jobPost.owner_id !== owner.id) {
    logAction(`${actionName}:owner:error`, applicationId, {
      jobPostId: current.job_post_id,
      currentOwnerId: owner.id,
      jobPostOwnerId: jobPost.owner_id,
    });
    throw new Error("현재 사장님이 관리할 수 있는 지원서가 아닙니다.");
  }

  if (!allowedFromStatuses.includes(current.status)) {
    logAction(`${actionName}:status:error`, applicationId, {
      existingRow: current,
      allowedFromStatuses,
      toStatus,
    });
    throw new Error(
      `현재 상태(${current.status})에서는 ${toStatus} 상태로 변경할 수 없습니다.`,
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("applications")
    .update({ status: toStatus })
    .eq("id", applicationId)
    .eq("job_post_id", jobPost.id)
    .select("*")
    .maybeSingle();

  if (error) {
    logAction(`${actionName}:update:error`, applicationId, {
      error: serializeSupabaseError(error),
      fromStatus: current.status,
      toStatus,
    });
    throw new Error(`지원 상태 변경에 실패했습니다: ${error.message}`);
  }
  if (!data) {
    logAction(`${actionName}:update:no-row`, applicationId, {
      fromStatus: current.status,
      toStatus,
    });
    throw new Error("지원 상태 변경 결과가 없습니다. DB row가 수정되지 않았습니다.");
  }

  const updated = data as Application;
  logAction(`${actionName}:update:success`, applicationId, {
    before: current,
    result: updated,
  });

  if (updated.status !== toStatus) {
    logAction(`${actionName}:verify:error`, applicationId, {
      before: current,
      expectedStatus: toStatus,
      result: updated,
    });
    throw new Error("지원 상태 변경 후 DB 상태 검증에 실패했습니다.");
  }

  await insertApplicationStatusLogOrThrow({
    applicationId,
    changedBy: owner.id,
    fromStatus: current.status,
    toStatus,
    memo,
  });

  if (shouldRevalidate) {
    revalidateOwnerApplicationPaths(applicationId, updated.job_post_id);
  }

  logAction(`${actionName}:done`, applicationId, {
    before: current,
    result: updated,
    changedBy: owner.id,
    memo,
  });
  return { application: updated, jobPost, owner };
}

export interface HiringSummary {
  applicationId: string;
  jobPostId: string;
  jobPostStatus: JobPost["status"];
  recruitCount: number;
  acceptedCount: number;
  isRecruitmentFilled: boolean;
  canCloseRecruitment: boolean;
}

export interface AcceptApplicationResult extends HiringSummary {
  application: Application;
}

async function getJobPostOrThrow(jobPostId: string): Promise<JobPost> {
  if (!isUuid(jobPostId)) {
    throw new Error("모집글 정보를 확인할 수 없습니다.");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("job_posts")
    .select("*")
    .eq("id", jobPostId)
    .maybeSingle();

  if (error) {
    throw new Error(`모집글 조회에 실패했습니다: ${error.message}`);
  }
  if (!data) {
    throw new Error("모집글을 찾을 수 없습니다.");
  }

  return data as JobPost;
}

async function getHiringSummaryForApplication(
  application: Application,
  jobPost: JobPost,
  owner: Profile,
): Promise<HiringSummary> {
  const supabase = createSupabaseAdminClient();
  const { count, error } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("job_post_id", application.job_post_id)
    .eq("recruitment_cycle", jobPost.recruitment_cycle)
    .eq("status", "accepted");

  if (error) {
    throw new Error(`채용 현황 조회에 실패했습니다: ${error.message}`);
  }

  const acceptedCount = count ?? 0;

  return {
    applicationId: application.id,
    jobPostId: application.job_post_id,
    jobPostStatus: jobPost.status,
    recruitCount: jobPost.recruit_count,
    acceptedCount,
    isRecruitmentFilled: acceptedCount >= jobPost.recruit_count,
    canCloseRecruitment:
      jobPost.owner_id === owner.id && jobPost.status !== "hidden",
  };
}

function revalidateOwnerApplicationPaths(
  applicationId: string,
  jobPostId?: string,
) {
  revalidatePath("/owner");
  revalidatePath("/owner/jobs");
  revalidatePath("/owner/applications");
  revalidatePath(`/owner/applications/${applicationId}`);

  if (jobPostId) {
    revalidatePath(`/owner/jobs/${jobPostId}/applications`);
  }
}

export async function markApplicationViewed(
  applicationId: string,
): Promise<Application> {
  const result = await updateApplicationStatusOrThrow({
    actionName: "markApplicationViewed",
    applicationId,
    toStatus: "viewed",
    allowedFromStatuses: ["submitted"],
    memo: "사장님 지원서 상세 열람",
  });
  return result.application;
}

export async function markApplicationViewedDuringRead(
  applicationId: string,
): Promise<Application> {
  const result = await updateApplicationStatusOrThrow({
    actionName: "markApplicationViewedDuringRead",
    applicationId,
    toStatus: "viewed",
    allowedFromStatuses: ["submitted"],
    memo: "사장님 지원서 상세 열람",
    shouldRevalidate: false,
  });
  return result.application;
}

export async function acceptApplication(
  applicationId: string,
): Promise<AcceptApplicationResult> {
  const { application, jobPost, owner } = await updateApplicationStatusOrThrow({
    actionName: "acceptApplication",
    applicationId,
    toStatus: "accepted",
    allowedFromStatuses: ["submitted", "viewed"],
    memo: "사장님 채용합격 처리",
  });
  const hiringSummary = await getHiringSummaryForApplication(
    application,
    jobPost,
    owner,
  );

  return {
    application,
    ...hiringSummary,
  };
}

export async function rejectApplication(
  applicationId: string,
): Promise<Application> {
  const result = await updateApplicationStatusOrThrow({
    actionName: "rejectApplication",
    applicationId,
    toStatus: "rejected",
    allowedFromStatuses: ["submitted", "viewed"],
    memo: "사장님 불합격 처리",
  });
  return result.application;
}

export async function closeRecruitmentAfterHiring({
  jobPostId,
  applicationId,
}: {
  jobPostId: string;
  applicationId: string;
}): Promise<JobPost> {
  if (!isUuid(applicationId)) {
    throw new Error("지원서 정보를 확인할 수 없습니다.");
  }

  const owner = await getCurrentOwnerOrThrow();
  const application = await getApplicationOrThrow(applicationId);

  if (application.job_post_id !== jobPostId) {
    throw new Error("지원서와 모집글 정보가 일치하지 않습니다.");
  }

  const current = await getJobPostOrThrow(application.job_post_id);

  logAction("closeRecruitmentAfterHiring:owner-check", applicationId, {
    jobPostId: current.id,
    currentOwnerId: owner.id,
    jobPostOwnerId: current.owner_id,
  });

  if (current.owner_id !== owner.id) {
    logAction("closeRecruitmentAfterHiring:owner:error", applicationId, {
      jobPostId: current.id,
      currentOwnerId: owner.id,
      jobPostOwnerId: current.owner_id,
    });
    throw new Error("현재 사장님이 관리할 수 있는 모집글이 아닙니다.");
  }
  if (current.status === "hidden") {
    throw new Error("숨김 처리된 모집글은 마감할 수 없습니다.");
  }
  if (current.status === "closed") {
    revalidateOwnerApplicationPaths(applicationId, jobPostId);
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
    throw new Error(`모집 마감 처리에 실패했습니다: ${error.message}`);
  }
  if (!data) {
    throw new Error("모집 마감 처리 결과가 없습니다.");
  }

  const updated = data as JobPost;
  if (updated.status !== "closed") {
    throw new Error("모집 마감 처리 후 DB 상태가 closed가 아닙니다.");
  }

  revalidateOwnerApplicationPaths(applicationId, jobPostId);
  return updated;
}

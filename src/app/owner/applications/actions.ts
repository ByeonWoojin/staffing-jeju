"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/uuid";
import type { Application, ApplicationStatus, Profile } from "@/types/database";

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
  const supabase = createSupabaseAdminClient();
  const devOwnerId = process.env.NEXT_PUBLIC_DEV_OWNER_ID;
  const baseQuery = supabase.from("profiles").select("*").eq("role", "owner");
  const query = devOwnerId
    ? baseQuery.eq("id", devOwnerId)
    : baseQuery.order("created_at", { ascending: true }).limit(1);

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("[owner/applications/actions] get owner error", {
      error: serializeSupabaseError(error),
    });
    throw new Error(`owner profile 조회에 실패했습니다: ${error.message}`);
  }
  if (!data) {
    throw new Error(
      devOwnerId
        ? `NEXT_PUBLIC_DEV_OWNER_ID=${devOwnerId}에 해당하는 owner profile이 없습니다.`
        : "role='owner' profile이 없습니다.",
    );
  }

  return data as Profile;
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
}: {
  actionName: string;
  applicationId: string;
  toStatus: ApplicationStatus;
  allowedFromStatuses: ApplicationStatus[];
  memo: string;
}): Promise<Application> {
  console.log(`[${actionName}] called`, applicationId);
  logUuidValidation(actionName, applicationId);

  const current = await getApplicationOrThrow(applicationId);

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

  const owner = await getCurrentOwnerOrThrow();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("applications")
    .update({ status: toStatus })
    .eq("id", applicationId)
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

  revalidatePath("/owner");
  revalidatePath("/owner/applications");
  revalidatePath(`/owner/applications/${applicationId}`);
  revalidatePath("/owner/jobs");

  logAction(`${actionName}:done`, applicationId, {
    before: current,
    result: updated,
    changedBy: owner.id,
    memo,
  });
  return updated;
}

export async function markApplicationViewed(
  applicationId: string,
): Promise<Application> {
  return updateApplicationStatusOrThrow({
    actionName: "markApplicationViewed",
    applicationId,
    toStatus: "viewed",
    allowedFromStatuses: ["submitted"],
    memo: "사장님 지원서 상세 열람",
  });
}

export async function acceptApplication(
  applicationId: string,
): Promise<Application> {
  return updateApplicationStatusOrThrow({
    actionName: "acceptApplication",
    applicationId,
    toStatus: "accepted",
    allowedFromStatuses: ["submitted", "viewed"],
    memo: "사장님 채용합격 처리",
  });
}

export async function rejectApplication(
  applicationId: string,
): Promise<Application> {
  return updateApplicationStatusOrThrow({
    actionName: "rejectApplication",
    applicationId,
    toStatus: "rejected",
    allowedFromStatuses: ["submitted", "viewed"],
    memo: "사장님 불합격 처리",
  });
}

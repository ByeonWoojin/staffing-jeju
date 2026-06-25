"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/uuid";
import type { JobPost, JobPostFormData, Profile } from "@/types/database";

type EditableJobPostField =
  | "title"
  | "recruit_count"
  | "gender_condition"
  | "age_condition"
  | "work_start_date"
  | "min_work_period"
  | "work_content"
  | "work_time"
  | "work_days_per_week"
  | "off_days_per_week"
  | "stipend_type"
  | "stipend_description"
  | "provides_accommodation"
  | "provides_meal"
  | "preferred_conditions"
  | "caution"
  | "extra_info"
  | "description";

type EditableJobPostUpdate = Pick<JobPost, EditableJobPostField>;

const EDITABLE_FIELDS: EditableJobPostField[] = [
  "title",
  "recruit_count",
  "gender_condition",
  "age_condition",
  "work_start_date",
  "min_work_period",
  "work_content",
  "work_time",
  "work_days_per_week",
  "off_days_per_week",
  "stipend_type",
  "stipend_description",
  "provides_accommodation",
  "provides_meal",
  "preferred_conditions",
  "caution",
  "extra_info",
  "description",
];

const REQUIRED_TEXT_FIELDS: EditableJobPostField[] = [
  "title",
  "work_start_date",
  "min_work_period",
  "work_content",
  "work_time",
];

const INVALID_JOB_POST_ID_MESSAGE =
  "개발용 mock 데이터에서는 저장할 수 없습니다. Supabase job_posts.id UUID를 사용해야 합니다.";

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
  console.log(`[owner/jobs/edit/actions] ${actionName}`, {
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

async function getCurrentOwnerOrThrow(): Promise<Profile> {
  const supabase = createSupabaseAdminClient();
  const devOwnerId = process.env.NEXT_PUBLIC_DEV_OWNER_ID;
  const baseQuery = supabase.from("profiles").select("*").eq("role", "owner");
  const query = devOwnerId
    ? baseQuery.eq("id", devOwnerId)
    : baseQuery.order("created_at", { ascending: true }).limit(1);

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("[owner/jobs/edit/actions] get owner error", {
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

function normalizeOptionalText(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName}은(는) 필수 입력값입니다.`);
  }
  return trimmed;
}

function normalizePayload(payload: JobPostFormData): EditableJobPostUpdate {
  const normalized: EditableJobPostUpdate = {
    title: normalizeRequiredText(payload.title, "모집 제목"),
    recruit_count: Number(payload.recruit_count),
    gender_condition: payload.gender_condition,
    age_condition: normalizeOptionalText(payload.age_condition),
    work_start_date: normalizeRequiredText(payload.work_start_date, "근무 시작일"),
    min_work_period: normalizeRequiredText(
      payload.min_work_period,
      "최소 근무 기간",
    ),
    work_content: normalizeRequiredText(payload.work_content, "업무 내용"),
    work_time: normalizeRequiredText(payload.work_time, "근무 시간"),
    work_days_per_week: Number(payload.work_days_per_week),
    off_days_per_week: Number(payload.off_days_per_week),
    stipend_type: payload.stipend_type,
    stipend_description: normalizeOptionalText(payload.stipend_description),
    provides_accommodation: Boolean(payload.provides_accommodation),
    provides_meal: Boolean(payload.provides_meal),
    preferred_conditions: normalizeOptionalText(payload.preferred_conditions),
    caution: normalizeOptionalText(payload.caution),
    extra_info: normalizeOptionalText(payload.extra_info),
    description: normalizeOptionalText(payload.description),
  };

  if (
    !Number.isInteger(normalized.recruit_count) ||
    normalized.recruit_count < 1
  ) {
    throw new Error("모집 인원은 1명 이상이어야 합니다.");
  }
  if (
    !Number.isInteger(normalized.work_days_per_week) ||
    normalized.work_days_per_week < 1 ||
    normalized.work_days_per_week > 7
  ) {
    throw new Error("주 근무일은 1~7 사이여야 합니다.");
  }
  if (
    !Number.isInteger(normalized.off_days_per_week) ||
    normalized.off_days_per_week < 0 ||
    normalized.off_days_per_week > 6
  ) {
    throw new Error("주 휴무일은 0~6 사이여야 합니다.");
  }

  return normalized;
}

function stringifyValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function getChangedFields(
  before: JobPost,
  nextValues: EditableJobPostUpdate,
): {
  field_name: EditableJobPostField;
  old_value: string | null;
  new_value: string | null;
}[] {
  return EDITABLE_FIELDS.flatMap((fieldName) => {
    const oldValue = stringifyValue(before[fieldName]);
    const newValue = stringifyValue(nextValues[fieldName]);

    if (oldValue === newValue) return [];
    return [
      {
        field_name: fieldName,
        old_value: oldValue,
        new_value: newValue,
      },
    ];
  });
}

export async function updateJobPost(
  jobPostId: string,
  payload: JobPostFormData,
): Promise<JobPost> {
  console.log("[updateJobPost] called", jobPostId);
  logUuidValidation("updateJobPost", jobPostId);
  assertValidJobPostId(jobPostId);

  for (const fieldName of REQUIRED_TEXT_FIELDS) {
    if (typeof payload[fieldName] === "string" && !payload[fieldName].trim()) {
      throw new Error(`${fieldName}은(는) 필수 입력값입니다.`);
    }
  }

  const owner = await getCurrentOwnerOrThrow();
  const current = await getJobPostOrThrow(jobPostId);

  if (current.owner_id !== owner.id) {
    logAction("updateJobPost:owner:error", jobPostId, {
      ownerId: owner.id,
      jobPostOwnerId: current.owner_id,
    });
    throw new Error("현재 owner가 수정할 수 있는 모집글이 아닙니다.");
  }

  const values = normalizePayload(payload);
  const changes = getChangedFields(current, values);

  if (changes.length === 0) {
    logAction("updateJobPost:no-changes", jobPostId, { values });
    throw new Error("변경된 내용이 없습니다.");
  }

  const supabase = createSupabaseAdminClient();
  logAction("updateJobPost:update:start", jobPostId, { values, changes });

  const { data, error } = await supabase
    .from("job_posts")
    .update(values)
    .eq("id", jobPostId)
    .select("*")
    .maybeSingle();

  if (error) {
    logAction("updateJobPost:update:error", jobPostId, {
      error: serializeSupabaseError(error),
    });
    throw new Error(`모집글 수정에 실패했습니다: ${error.message}`);
  }
  if (!data) {
    logAction("updateJobPost:update:no-row", jobPostId, { values });
    throw new Error("모집글 수정 결과가 없습니다. DB row가 수정되지 않았습니다.");
  }

  const updated = data as JobPost;
  logAction("updateJobPost:update:success", jobPostId, { result: updated });

  const logRows = changes.map((change) => ({
    job_post_id: jobPostId,
    changed_by: owner.id,
    field_name: change.field_name,
    old_value: change.old_value,
    new_value: change.new_value,
  }));

  const { data: logData, error: logError } = await supabase
    .from("job_post_update_logs")
    .insert(logRows)
    .select("*");

  if (logError) {
    logAction("updateJobPost:logs:error", jobPostId, {
      error: serializeSupabaseError(logError),
      logRows,
    });
    throw new Error(`모집글 수정 로그 기록에 실패했습니다: ${logError.message}`);
  }
  if (!logData || logData.length !== logRows.length) {
    logAction("updateJobPost:logs:no-row", jobPostId, {
      expectedLogCount: logRows.length,
      result: logData,
    });
    throw new Error("모집글 수정 로그 기록 결과가 올바르지 않습니다.");
  }

  revalidatePath("/owner");
  revalidatePath("/owner/jobs");
  revalidatePath(`/owner/jobs/${jobPostId}/edit`);

  logAction("updateJobPost:done", jobPostId, {
    before: current,
    result: updated,
    logCount: logRows.length,
  });
  return updated;
}

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import { normalizeUpdatedWorkStartDate } from "@/lib/job-post-date-validation";
import { isUuid } from "@/lib/uuid";
import type {
  JobPost,
  JobPostFormData,
  JobPostPhoto,
  Profile,
} from "@/types/database";

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
  | "has_party"
  | "party_description"
  | "preferred_conditions"
  | "caution"
  | "extra_info"
  | "description";

type EditableJobPostUpdate = Pick<JobPost, EditableJobPostField>;

export type JobPostUpdateActionCode =
  | "SUCCESS"
  | "NO_CHANGES"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "UPDATE_FAILED";

export type JobPostUpdateActionResult = {
  success: boolean;
  code: JobPostUpdateActionCode;
  message: string;
  fieldErrors?: Partial<Record<EditableJobPostField, string[]>>;
};

export type JobPostPhotoActionResult = {
  success: boolean;
  code:
    | "SUCCESS"
    | "VALIDATION_ERROR"
    | "UNAUTHORIZED"
    | "NOT_FOUND"
    | "UPDATE_FAILED";
  message: string;
};

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
  "has_party",
  "party_description",
  "preferred_conditions",
  "caution",
  "extra_info",
  "description",
];

const REQUIRED_TEXT_FIELDS: EditableJobPostField[] = [
  "title",
  "min_work_period",
  "work_content",
  "work_time",
];

const INVALID_JOB_POST_ID_MESSAGE =
  "개발용 mock 데이터에서는 저장할 수 없습니다. Supabase job_posts.id UUID를 사용해야 합니다.";
const JOB_POST_IMAGE_BUCKET = "job-post-images";
const MAX_PHOTO_COUNT = 5;
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

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
  console.info(`[owner-job-edit] ${actionName}`, {
    job_post_id: jobPostId,
    ...payload,
  });
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

async function getCurrentOwnerOrThrow(): Promise<Profile> {
  const authUser = await getCurrentAuthUser();
  if (!authUser) {
    throw new Error("로그인이 필요합니다.");
  }

  const profile = await getProfileById(authUser.id);
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

  logAction("getJobPostOrThrow:success", jobPostId, {
    owner_id: data.owner_id,
    guesthouse_id: data.guesthouse_id,
    success: true,
  });
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

function normalizePayload(
  payload: JobPostFormData,
  currentWorkStartDate: string,
): EditableJobPostUpdate {
  const normalized: EditableJobPostUpdate = {
    title: normalizeRequiredText(payload.title, "모집 제목"),
    recruit_count: Number(payload.recruit_count),
    gender_condition: payload.gender_condition,
    age_condition: normalizeOptionalText(payload.age_condition),
    work_start_date: normalizeUpdatedWorkStartDate(
      payload.work_start_date,
      currentWorkStartDate,
    ),
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
    has_party: Boolean(payload.has_party),
    party_description: normalizeOptionalText(payload.party_description),
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

function actionResult(
  code: JobPostUpdateActionCode,
  message: string,
  fieldErrors?: JobPostUpdateActionResult["fieldErrors"],
): JobPostUpdateActionResult {
  return {
    success: code === "SUCCESS",
    code,
    message,
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

function createValidationResult(message: string): JobPostUpdateActionResult {
  return actionResult("VALIDATION_ERROR", message);
}

function photoActionResult(
  code: JobPostPhotoActionResult["code"],
  message: string,
): JobPostPhotoActionResult {
  return {
    success: code === "SUCCESS",
    code,
    message,
  };
}

export async function updateJobPost(
  jobPostId: string,
  payload: JobPostFormData,
): Promise<JobPostUpdateActionResult> {
  logAction("job_edit_action_started", jobPostId, {});
  logUuidValidation("updateJobPost", jobPostId);

  if (!isUuid(jobPostId)) {
    logAction("action_failed", jobPostId, {
      step: "job_id_validation",
      code: "VALIDATION_ERROR",
    });
    return actionResult("VALIDATION_ERROR", INVALID_JOB_POST_ID_MESSAGE);
  }

  for (const fieldName of REQUIRED_TEXT_FIELDS) {
    if (typeof payload[fieldName] === "string" && !payload[fieldName].trim()) {
      logAction("action_failed", jobPostId, {
        step: "required_field_validation",
        code: "VALIDATION_ERROR",
        field_name: fieldName,
      });
      return createValidationResult(`${fieldName}은(는) 필수 입력값입니다.`);
    }
  }

  try {
    const authUser = await getCurrentAuthUser();
    if (!authUser) {
      logAction("action_failed", jobPostId, {
        step: "auth",
        code: "UNAUTHORIZED",
      });
      return actionResult("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const owner = await getProfileById(authUser.id);
    if (!owner || owner.role !== "owner") {
      logAction("action_failed", jobPostId, {
        step: "owner_profile",
        user_id: authUser.id,
        code: "UNAUTHORIZED",
      });
      return actionResult(
        "UNAUTHORIZED",
        "사장님 계정만 실행할 수 있는 작업입니다.",
      );
    }

    logAction("auth_completed", jobPostId, {
      user_id: owner.id,
      success: true,
    });

    const supabase = createSupabaseAdminClient();
    const { data: currentData, error: loadError } = await supabase
      .from("job_posts")
      .select("*")
      .eq("id", jobPostId)
      .maybeSingle();

    if (loadError) {
      console.error("[owner-job-edit] action_failed", {
        step: "job_post_loaded",
        user_id: owner.id,
        job_post_id: jobPostId,
        error: serializeSupabaseError(loadError),
      });
      return actionResult(
        "UPDATE_FAILED",
        "변경사항을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
    if (!currentData) {
      logAction("action_failed", jobPostId, {
        step: "job_post_loaded",
        user_id: owner.id,
        code: "NOT_FOUND",
      });
      return actionResult("NOT_FOUND", "모집글을 찾을 수 없습니다.");
    }

    const current = currentData as JobPost;
    logAction("job_post_loaded", jobPostId, {
      user_id: owner.id,
      guesthouse_id: current.guesthouse_id,
      success: true,
    });
    logAction("guesthouse_loaded", jobPostId, {
      user_id: owner.id,
      guesthouse_id: current.guesthouse_id,
      success: true,
    });

    if (current.owner_id !== owner.id) {
      logAction("action_failed", jobPostId, {
        step: "owner_check",
        user_id: owner.id,
        guesthouse_id: current.guesthouse_id,
        code: "UNAUTHORIZED",
      });
      return actionResult(
        "UNAUTHORIZED",
        "현재 owner가 수정할 수 있는 모집글이 아닙니다.",
      );
    }

    let values: EditableJobPostUpdate;
    try {
      values = normalizePayload(payload, current.work_start_date);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "입력값을 확인해 주세요.";
      logAction("action_failed", jobPostId, {
        step: "form_data_parsed",
        user_id: owner.id,
        guesthouse_id: current.guesthouse_id,
        code: "VALIDATION_ERROR",
      });
      return createValidationResult(message);
    }

    logAction("form_data_parsed", jobPostId, {
      user_id: owner.id,
      guesthouse_id: current.guesthouse_id,
      success: true,
    });

    const changes = getChangedFields(current, values);
    logAction("job_changes_checked", jobPostId, {
      user_id: owner.id,
      guesthouse_id: current.guesthouse_id,
      success: true,
      change_count: changes.length,
      changed_fields: changes.map((change) => change.field_name),
    });
    logAction("guesthouse_changes_checked", jobPostId, {
      user_id: owner.id,
      guesthouse_id: current.guesthouse_id,
      success: true,
      change_count: 0,
    });
    logAction("image_changes_checked", jobPostId, {
      user_id: owner.id,
      guesthouse_id: current.guesthouse_id,
      success: true,
      change_count: 0,
      note: "job_post_photos are persisted by dedicated photo actions",
    });

    if (changes.length === 0) {
      return actionResult("NO_CHANGES", "변경된 내용이 없습니다.");
    }

    logAction("update_started", jobPostId, {
      user_id: owner.id,
      guesthouse_id: current.guesthouse_id,
      change_count: changes.length,
    });

    const { data, error } = await supabase
      .from("job_posts")
      .update(values)
      .eq("id", jobPostId)
      .eq("owner_id", owner.id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[owner-job-edit] action_failed", {
        step: "update_started",
        user_id: owner.id,
        job_post_id: jobPostId,
        guesthouse_id: current.guesthouse_id,
        error: serializeSupabaseError(error),
      });
      return actionResult(
        "UPDATE_FAILED",
        "변경사항을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
    if (!data) {
      logAction("action_failed", jobPostId, {
        step: "update_started",
        user_id: owner.id,
        guesthouse_id: current.guesthouse_id,
        code: "NOT_FOUND",
      });
      return actionResult("NOT_FOUND", "모집글 수정 결과가 없습니다.");
    }

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
      .select("id");

    if (logError || !logData || logData.length !== logRows.length) {
      console.error("[owner-job-edit] action_failed", {
        step: "update_log",
        user_id: owner.id,
        job_post_id: jobPostId,
        guesthouse_id: current.guesthouse_id,
        error: logError ? serializeSupabaseError(logError) : null,
        expected_log_count: logRows.length,
        actual_log_count: logData?.length ?? 0,
      });
    }

    logAction("update_completed", jobPostId, {
      user_id: owner.id,
      guesthouse_id: current.guesthouse_id,
      success: true,
      change_count: changes.length,
    });

    logAction("revalidation_started", jobPostId, {
      user_id: owner.id,
      guesthouse_id: current.guesthouse_id,
    });
    revalidatePath("/owner");
    revalidatePath("/owner/jobs");
    revalidatePath(`/owner/jobs/${jobPostId}/edit`);

    logAction("redirect_started", jobPostId, {
      user_id: owner.id,
      guesthouse_id: current.guesthouse_id,
      redirect_to: "/owner/jobs",
    });
    return actionResult("SUCCESS", "변경사항이 저장되었습니다.");
  } catch (error) {
    console.error("[owner-job-edit] action_failed", {
      step: "unexpected",
      job_post_id: jobPostId,
      error: serializeSupabaseError(error),
    });
    return actionResult(
      "UPDATE_FAILED",
      "변경사항을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }
}

function getPhotoExtension(file: File): string {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

async function getJobPostPhotoOrThrow(photoId: string): Promise<JobPostPhoto> {
  if (!isUuid(photoId)) {
    throw new Error("사진 ID가 올바르지 않습니다.");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("job_post_photos")
    .select("*")
    .eq("id", photoId)
    .maybeSingle();

  if (error) {
    console.error("[getJobPostPhotoOrThrow] lookup failed", {
      error: serializeSupabaseError(error),
    });
    throw new Error("사진 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }
  if (!data) {
    throw new Error("사진을 찾을 수 없습니다.");
  }

  return data as JobPostPhoto;
}

export async function uploadJobPostPhoto(
  formData: FormData,
): Promise<JobPostPhotoActionResult> {
  const jobPostId = String(formData.get("jobPostId") ?? "");
  const file = formData.get("photo");

  if (!isUuid(jobPostId)) {
    return photoActionResult("VALIDATION_ERROR", INVALID_JOB_POST_ID_MESSAGE);
  }
  if (!(file instanceof File) || file.size === 0) {
    return photoActionResult("VALIDATION_ERROR", "업로드할 사진을 선택해주세요.");
  }
  if (!ALLOWED_PHOTO_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_TYPES)[number])) {
    return photoActionResult(
      "VALIDATION_ERROR",
      "JPG, PNG, WEBP 형식의 이미지만 업로드할 수 있습니다.",
    );
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return photoActionResult(
      "VALIDATION_ERROR",
      "사진은 1장당 최대 5MB까지만 업로드할 수 있습니다.",
    );
  }

  try {
    const owner = await getCurrentOwnerOrThrow();
    const jobPost = await getJobPostOrThrow(jobPostId);
    if (jobPost.owner_id !== owner.id) {
      return photoActionResult(
        "UNAUTHORIZED",
        "현재 owner가 수정할 수 있는 모집글이 아닙니다.",
      );
    }

    const supabase = createSupabaseAdminClient();
    const { count, error: countError } = await supabase
      .from("job_post_photos")
      .select("id", { count: "exact", head: true })
      .eq("job_post_id", jobPostId);

    if (countError) {
      console.error("[uploadJobPostPhoto] count failed", {
        user_id: owner.id,
        job_post_id: jobPostId,
        guesthouse_id: jobPost.guesthouse_id,
        error: serializeSupabaseError(countError),
      });
      return photoActionResult(
        "UPDATE_FAILED",
        "사진 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    }
    if ((count ?? 0) >= MAX_PHOTO_COUNT) {
      return photoActionResult(
        "VALIDATION_ERROR",
        "모집글 사진은 최대 5장까지 등록할 수 있습니다.",
      );
    }

    const ext = getPhotoExtension(file);
    const photoPath = `job-posts/${jobPostId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(JOB_POST_IMAGE_BUCKET)
      .upload(photoPath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[uploadJobPostPhoto] storage upload failed", {
        user_id: owner.id,
        job_post_id: jobPostId,
        guesthouse_id: jobPost.guesthouse_id,
        error: serializeSupabaseError(uploadError),
      });
      return photoActionResult(
        "UPDATE_FAILED",
        "사진 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    }

    const { error: insertError } = await supabase.from("job_post_photos").insert({
      job_post_id: jobPostId,
      owner_id: owner.id,
      photo_path: photoPath,
      alt_text: jobPost.title,
      sort_order: count ?? 0,
    });

    if (insertError) {
      await supabase.storage.from(JOB_POST_IMAGE_BUCKET).remove([photoPath]);
      console.error("[uploadJobPostPhoto] insert failed", {
        user_id: owner.id,
        job_post_id: jobPostId,
        guesthouse_id: jobPost.guesthouse_id,
        error: serializeSupabaseError(insertError),
      });
      return photoActionResult(
        "UPDATE_FAILED",
        "사진 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    }

    revalidatePath("/owner");
    revalidatePath("/owner/jobs");
    revalidatePath(`/owner/jobs/${jobPostId}/edit`);
    return photoActionResult("SUCCESS", "사진을 업로드했어요.");
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "로그인이 필요합니다." ||
        error.message === "사장님 계정만 실행할 수 있는 작업입니다."
      ) {
        return photoActionResult("UNAUTHORIZED", error.message);
      }
      if (error.message === "모집글을 찾을 수 없습니다.") {
        return photoActionResult("NOT_FOUND", error.message);
      }
    }

    console.error("[uploadJobPostPhoto] action failed", {
      job_post_id: jobPostId,
      error: serializeSupabaseError(error),
    });
    return photoActionResult(
      "UPDATE_FAILED",
      "사진 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.",
    );
  }
}

export async function deleteJobPostPhoto(
  photoId: string,
): Promise<JobPostPhotoActionResult> {
  if (!isUuid(photoId)) {
    return photoActionResult("VALIDATION_ERROR", "사진 ID가 올바르지 않습니다.");
  }

  try {
    const owner = await getCurrentOwnerOrThrow();
    const photo = await getJobPostPhotoOrThrow(photoId);
    const jobPost = await getJobPostOrThrow(photo.job_post_id);

    if (photo.owner_id !== owner.id || jobPost.owner_id !== owner.id) {
      return photoActionResult(
        "UNAUTHORIZED",
        "현재 owner가 삭제할 수 있는 사진이 아닙니다.",
      );
    }

    const supabase = createSupabaseAdminClient();
    const { error: deleteError } = await supabase
      .from("job_post_photos")
      .delete()
      .eq("id", photo.id)
      .eq("owner_id", owner.id);

    if (deleteError) {
      console.error("[deleteJobPostPhoto] delete failed", {
        user_id: owner.id,
        job_post_id: jobPost.id,
        guesthouse_id: jobPost.guesthouse_id,
        error: serializeSupabaseError(deleteError),
      });
      return photoActionResult(
        "UPDATE_FAILED",
        "사진 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    }

    const { error: removeError } = await supabase.storage
      .from(JOB_POST_IMAGE_BUCKET)
      .remove([photo.photo_path]);

    if (removeError) {
      console.error("[deleteJobPostPhoto] storage remove failed", {
        user_id: owner.id,
        job_post_id: jobPost.id,
        guesthouse_id: jobPost.guesthouse_id,
        error: serializeSupabaseError(removeError),
      });
    }

    revalidatePath("/owner");
    revalidatePath("/owner/jobs");
    revalidatePath(`/owner/jobs/${jobPost.id}/edit`);
    return photoActionResult("SUCCESS", "사진을 삭제했어요.");
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "로그인이 필요합니다." ||
        error.message === "사장님 계정만 실행할 수 있는 작업입니다."
      ) {
        return photoActionResult("UNAUTHORIZED", error.message);
      }
      if (
        error.message === "사진을 찾을 수 없습니다." ||
        error.message === "모집글을 찾을 수 없습니다."
      ) {
        return photoActionResult("NOT_FOUND", error.message);
      }
    }

    console.error("[deleteJobPostPhoto] action failed", {
      photo_id: photoId,
      error: serializeSupabaseError(error),
    });
    return photoActionResult(
      "UPDATE_FAILED",
      "사진 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.",
    );
  }
}

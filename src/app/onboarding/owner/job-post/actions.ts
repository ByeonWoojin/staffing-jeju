"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import type {
  GenderCondition,
  JobPost,
  JobPostPhoto,
  JobPostFormData,
  StipendType,
} from "@/types/database";

type NewJobPostValues = Omit<
  Pick<
    JobPost,
    | "guesthouse_id"
    | "owner_id"
    | "slug"
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
    | "is_urgent"
    | "last_urgent_marked_at"
    | "preferred_conditions"
    | "caution"
    | "extra_info"
    | "description"
    | "status"
    | "recruitment_cycle"
    | "bumped_at"
    | "last_bumped_at"
    | "bump_count"
  >,
  "bumped_at"
> & {
  bumped_at: string | null;
};

const GENDER_VALUES: GenderCondition[] = ["any", "male", "female"];
const STIPEND_VALUES: StipendType[] = [
  "none",
  "provided",
  "negotiable",
  "custom",
];
const JOB_POST_IMAGE_BUCKET = "job-post-images";

function normalizeRequiredText(value: string, fieldLabel: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldLabel}은(는) 필수 입력값입니다.`);
  }
  return trimmed;
}

function normalizeOptionalText(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeInteger(
  value: number,
  fieldLabel: string,
  min: number,
  max?: number,
): number {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < min) {
    throw new Error(`${fieldLabel} 값이 올바르지 않습니다.`);
  }
  if (max !== undefined && normalized > max) {
    throw new Error(`${fieldLabel} 값이 올바르지 않습니다.`);
  }
  return normalized;
}

function normalizeGender(value: GenderCondition): GenderCondition {
  if (!GENDER_VALUES.includes(value)) {
    throw new Error("성별 조건 값이 올바르지 않습니다.");
  }
  return value;
}

function normalizeStipendType(value: StipendType): StipendType {
  if (!STIPEND_VALUES.includes(value)) {
    throw new Error("급여/지원금 값이 올바르지 않습니다.");
  }
  return value;
}

function createJobPostSlug(): string {
  const randomPart = crypto.randomUUID().split("-")[0];
  return `job-${Date.now()}-${randomPart}`;
}

function normalizePayload(
  ownerId: string,
  guesthouseId: string,
  payload: JobPostFormData,
): NewJobPostValues {
  return {
    guesthouse_id: guesthouseId,
    owner_id: ownerId,
    slug: createJobPostSlug(),
    title: normalizeRequiredText(payload.title, "모집 제목"),
    recruit_count: normalizeInteger(payload.recruit_count, "모집 인원", 1),
    gender_condition: normalizeGender(payload.gender_condition),
    age_condition: normalizeOptionalText(payload.age_condition),
    work_start_date: normalizeRequiredText(payload.work_start_date, "근무 시작일"),
    min_work_period: normalizeRequiredText(
      payload.min_work_period,
      "최소 근무 기간",
    ),
    work_content: normalizeRequiredText(payload.work_content, "업무 내용"),
    work_time: normalizeRequiredText(payload.work_time, "근무 시간"),
    work_days_per_week: normalizeInteger(
      payload.work_days_per_week,
      "주 근무일",
      1,
      7,
    ),
    off_days_per_week: normalizeInteger(
      payload.off_days_per_week,
      "주 휴무일",
      0,
      6,
    ),
    stipend_type: normalizeStipendType(payload.stipend_type),
    stipend_description: normalizeOptionalText(payload.stipend_description),
    provides_accommodation: Boolean(payload.provides_accommodation),
    provides_meal: Boolean(payload.provides_meal),
    is_urgent: false,
    last_urgent_marked_at: null,
    preferred_conditions: normalizeOptionalText(payload.preferred_conditions),
    caution: normalizeOptionalText(payload.caution),
    extra_info: normalizeOptionalText(payload.extra_info),
    description: normalizeOptionalText(payload.description),
    status: "open",
    recruitment_cycle: 1,
    bumped_at: null,
    last_bumped_at: null,
    bump_count: 0,
  };
}

async function getOwnerIdOrRedirect(): Promise<string | null> {
  const user = await getCurrentAuthUser();
  if (!user) return null;

  const profile = await getProfileById(user.id);
  if (!profile || profile.role !== "owner") return null;

  return profile.id;
}

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

async function deleteExistingJobPostPhotos(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  jobPostId: string,
) {
  const { data: photos, error: photoError } = await supabase
    .from("job_post_photos")
    .select("*")
    .eq("job_post_id", jobPostId);

  if (photoError) {
    console.error("[createOwnerJobPost] hidden photo lookup failed", {
      error: serializeSupabaseError(photoError),
    });
    throw new Error("기존 모집글 사진 정리에 실패했습니다.");
  }

  const existingPhotos = (photos ?? []) as JobPostPhoto[];
  if (existingPhotos.length === 0) return;

  const photoPaths = existingPhotos.map((photo) => photo.photo_path);
  const { error: removeError } = await supabase.storage
    .from(JOB_POST_IMAGE_BUCKET)
    .remove(photoPaths);

  if (removeError) {
    console.error("[createOwnerJobPost] hidden storage cleanup failed", {
      error: serializeSupabaseError(removeError),
      photoPaths,
    });
    throw new Error("기존 모집글 사진 정리에 실패했습니다.");
  }

  const { error: deleteError } = await supabase
    .from("job_post_photos")
    .delete()
    .eq("job_post_id", jobPostId);

  if (deleteError) {
    console.error("[createOwnerJobPost] hidden photo row cleanup failed", {
      error: serializeSupabaseError(deleteError),
    });
    throw new Error("기존 모집글 사진 정리에 실패했습니다.");
  }
}

export async function createOwnerJobPost(
  payload: JobPostFormData,
): Promise<string> {
  const ownerId = await getOwnerIdOrRedirect();
  if (!ownerId) return "/";

  const supabase = createSupabaseAdminClient();

  const { data: guesthouse, error: guesthouseError } = await supabase
    .from("guesthouses")
    .select("id")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (guesthouseError) {
    throw new Error(`게스트하우스 조회에 실패했습니다: ${guesthouseError.message}`);
  }
  if (!guesthouse) {
    return "/onboarding/owner/guesthouse";
  }

  const { data: existing, error: existingError } = await supabase
    .from("job_posts")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("guesthouse_id", guesthouse.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(`모집글 조회에 실패했습니다: ${existingError.message}`);
  }
  if (existing && existing.status !== "hidden") {
    return "/owner";
  }

  const values = normalizePayload(ownerId, guesthouse.id, payload);
  if (existing) {
    const existingJobPost = existing as JobPost;
    const nextRecruitmentCycle = existingJobPost.recruitment_cycle
      ? existingJobPost.recruitment_cycle + 1
      : 1;

    await deleteExistingJobPostPhotos(supabase, existingJobPost.id);

    const { data: updated, error } = await supabase
      .from("job_posts")
      .update({
        ...values,
        recruitment_cycle: nextRecruitmentCycle,
      })
      .eq("id", existingJobPost.id)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(`모집글 재등록에 실패했습니다: ${error.message}`);
    }
    if (!updated || updated.status !== "open") {
      throw new Error("모집글 재등록 후 DB 상태 검증에 실패했습니다.");
    }

    revalidatePath("/onboarding/owner/job-post");
    revalidatePath("/owner");
    revalidatePath("/owner/jobs");
    return `/owner/jobs/${updated.id}/edit`;
  }

  const { data: created, error } = await supabase
    .from("job_posts")
    .insert(values)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`모집글 등록에 실패했습니다: ${error.message}`);
  }
  if (!created) {
    throw new Error("모집글 등록 결과가 없습니다.");
  }

  revalidatePath("/onboarding/owner/job-post");
  revalidatePath("/owner");
  revalidatePath("/owner/jobs");
  return `/owner/jobs/${created.id}/edit`;
}

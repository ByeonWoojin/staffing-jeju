"use server";

import { revalidatePath } from "next/cache";
import type {
  Application,
  ApplicationStatus,
  ExperienceStatus,
  GenderCondition,
  JobPost,
  Profile,
} from "@/types/database";
import {
  buildApplicationPhotoPath,
  removeApplicationPhoto,
  uploadApplicationPhoto,
  validateApplicationPhoto,
} from "@/lib/application-photo";
import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SubmitApplicationResult =
  | { ok: true; message: string; redirectTo: string }
  | { ok: false; message: string; redirectTo?: string };

const VALID_GENDERS = new Set<GenderCondition>(["male", "female"]);
const VALID_EXPERIENCE_STATUSES = new Set<ExperienceStatus>([
  "none",
  "experienced",
]);

function getRequiredText(formData: FormData, key: string, label: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label}을 입력해주세요.`);
  }

  return value.trim();
}

function getRequiredNumber(formData: FormData, key: string, label: string) {
  const value = getRequiredText(formData, key, label);
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${label}을 올바르게 입력해주세요.`);
  }

  return number;
}

function getRequiredDate(formData: FormData, key: string, label: string) {
  const value = getRequiredText(formData, key, label);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label}을 올바르게 선택해주세요.`);
  }

  return value;
}

function getGender(formData: FormData) {
  const value = getRequiredText(formData, "gender", "성별");
  if (!VALID_GENDERS.has(value as GenderCondition)) {
    throw new Error("성별을 올바르게 선택해주세요.");
  }

  return value as GenderCondition;
}

function getExperienceStatus(formData: FormData) {
  const value = getRequiredText(formData, "experienceStatus", "스탭 경험");
  if (!VALID_EXPERIENCE_STATUSES.has(value as ExperienceStatus)) {
    throw new Error("스탭 경험을 올바르게 선택해주세요.");
  }

  return value as ExperienceStatus;
}

async function getCurrentStaffProfile(): Promise<
  { ok: true; profile: Profile } | { ok: false; result: SubmitApplicationResult }
> {
  const user = await getCurrentAuthUser();
  if (!user) {
    return {
      ok: false,
      result: {
        ok: false,
        message: "지원하려면 로그인이 필요합니다.",
        redirectTo: "/",
      },
    };
  }

  const profile = await getProfileById(user.id);
  if (!profile) {
    return {
      ok: false,
      result: {
        ok: false,
        message: "역할 선택 후 지원할 수 있습니다.",
        redirectTo: "/onboarding/role",
      },
    };
  }

  if (profile.role === "owner") {
    return {
      ok: false,
      result: {
        ok: false,
        message: "사장님 계정에서는 지원 기능을 사용할 수 없습니다.",
      },
    };
  }

  if (profile.role !== "staff") {
    return {
      ok: false,
      result: {
        ok: false,
        message: "스탭 계정에서만 지원할 수 있습니다.",
      },
    };
  }

  return { ok: true, profile };
}

async function getOpenJobPostBySlug(slug: string): Promise<
  | { ok: true; jobPost: JobPost }
  | { ok: false; result: SubmitApplicationResult }
> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("job_posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[apply/actions] job post lookup failed", {
      slug,
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return {
      ok: false,
      result: {
        ok: false,
        message: "모집글을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
      },
    };
  }

  if (!data) {
    return {
      ok: false,
      result: { ok: false, message: "존재하지 않는 모집글입니다.", redirectTo: "/jobs" },
    };
  }

  const jobPost = data as JobPost;
  if (jobPost.status !== "open") {
    return {
      ok: false,
      result: { ok: false, message: "모집이 종료된 공고입니다." },
    };
  }

  return { ok: true, jobPost };
}

async function insertApplicationStatusLog({
  applicationId,
  changedBy,
  fromStatus,
  toStatus,
  memo,
}: {
  applicationId: string;
  changedBy: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  memo: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("application_status_logs").insert({
    application_id: applicationId,
    changed_by: changedBy,
    from_status: fromStatus,
    to_status: toStatus,
    memo,
  });

  if (error) {
    console.error("[apply/actions] status log insert failed", {
      applicationId,
      fromStatus,
      toStatus,
      memo,
      message: error.message,
      code: error.code,
      details: error.details,
    });
    throw new Error("지원 상태 로그 기록에 실패했습니다.");
  }
}

function revalidateApplicationViews(slug: string, applicationId?: string) {
  revalidatePath(`/jobs/${slug}`);
  revalidatePath(`/jobs/${slug}/apply`);
  revalidatePath("/staff/applications");
  revalidatePath("/owner");
  revalidatePath("/owner/applications");
  revalidatePath("/owner/jobs");

  if (applicationId) {
    revalidatePath(`/owner/applications/${applicationId}`);
  }
}

export async function submitJobApplication(
  slug: string,
  formData: FormData,
): Promise<SubmitApplicationResult> {
  try {
    const staffResult = await getCurrentStaffProfile();
    if (!staffResult.ok) return staffResult.result;

    const jobPostResult = await getOpenJobPostBySlug(slug);
    if (!jobPostResult.ok) return jobPostResult.result;

    const profile = staffResult.profile;
    const jobPost = jobPostResult.jobPost;
    const supabase = createSupabaseAdminClient();

    const { data: existing, error: existingError } = await supabase
      .from("applications")
      .select("*")
      .eq("job_post_id", jobPost.id)
      .eq("staff_id", profile.id)
      .eq("recruitment_cycle", jobPost.recruitment_cycle)
      .maybeSingle();

    if (existingError) {
      console.error("[apply/actions] duplicate lookup failed", {
        jobPostId: jobPost.id,
        staffId: profile.id,
        message: existingError.message,
        code: existingError.code,
        details: existingError.details,
      });
      return {
        ok: false,
        message: "지원 이력을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
      };
    }

    const existingApplication = existing as Application | null;
    if (existingApplication && existingApplication.status !== "canceled") {
      return {
        ok: false,
        message: "이미 지원한 모집글입니다.",
        redirectTo: "/staff/applications",
      };
    }

    const photo = formData.get("representativePhoto");
    const photoFile = photo instanceof File ? photo : null;
    const photoValidation = validateApplicationPhoto(photoFile);
    if (!photoValidation.ok) {
      return { ok: false, message: photoValidation.message };
    }
    if (!photoFile) {
      return { ok: false, message: "대표사진을 등록해주세요." };
    }

    const payload = {
      job_post_id: jobPost.id,
      staff_id: profile.id,
      recruitment_cycle: jobPost.recruitment_cycle,
      name: getRequiredText(formData, "name", "이름"),
      age: getRequiredNumber(formData, "age", "나이"),
      gender: getGender(formData),
      phone: getRequiredText(formData, "phone", "연락처"),
      available_start_date: getRequiredDate(
        formData,
        "availableStartDate",
        "입도 가능일",
      ),
      available_work_period: getRequiredText(
        formData,
        "availableWorkPeriod",
        "가능 근무 기간",
      ),
      experience_status: getExperienceStatus(formData),
      introduction: getRequiredText(formData, "introduction", "자기소개"),
      representative_photo_path: buildApplicationPhotoPath({
        jobPostId: jobPost.id,
        staffId: profile.id,
        extension: photoValidation.extension,
      }),
      status: "submitted" as ApplicationStatus,
    };

    await uploadApplicationPhoto(payload.representative_photo_path, photoFile);

    let application: Application | null = null;
    try {
      if (existingApplication) {
        const { data, error } = await supabase
          .from("applications")
          .update({
            name: payload.name,
            age: payload.age,
            gender: payload.gender,
            phone: payload.phone,
            representative_photo_path: payload.representative_photo_path,
            available_start_date: payload.available_start_date,
            available_work_period: payload.available_work_period,
            experience_status: payload.experience_status,
            introduction: payload.introduction,
            status: "submitted",
          })
          .eq("id", existingApplication.id)
          .eq("staff_id", profile.id)
          .eq("status", "canceled")
          .select("*")
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          throw new Error("재지원 처리 결과가 없습니다.");
        }

        application = data as Application;
        await insertApplicationStatusLog({
          applicationId: application.id,
          changedBy: profile.id,
          fromStatus: "canceled",
          toStatus: "submitted",
          memo: "스탭 지원서 재제출",
        });
      } else {
        const { data, error } = await supabase
          .from("applications")
          .insert(payload)
          .select("*")
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          throw new Error("지원서 제출 결과가 없습니다.");
        }

        application = data as Application;
        await insertApplicationStatusLog({
          applicationId: application.id,
          changedBy: profile.id,
          fromStatus: null,
          toStatus: "submitted",
          memo: "스탭 지원서 제출",
        });
      }
    } catch (error) {
      if (!application) {
        await removeApplicationPhoto(payload.representative_photo_path);
      }
      console.error("[apply/actions] application submit failed", {
        jobPostId: jobPost.id,
        staffId: profile.id,
        error,
      });
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "지원서 제출에 실패했습니다. 잠시 후 다시 시도해주세요.",
      };
    }

    revalidateApplicationViews(slug, application.id);

    return {
      ok: true,
      message: "지원서가 제출되었습니다. 사장님이 확인하면 지원 상태가 변경됩니다.",
      redirectTo: "/staff/applications?submitted=1",
    };
  } catch (error) {
    console.error("[apply/actions] unexpected error", error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "지원서 제출에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/uuid";
import type { Application } from "@/types/database";

export type CancelApplicationResult =
  | { ok: true; message: string }
  | { ok: false; message: string; redirectTo?: string };

function revalidateApplicationViews(applicationId: string) {
  revalidatePath("/staff/applications");
  revalidatePath("/owner");
  revalidatePath("/owner/applications");
  revalidatePath(`/owner/applications/${applicationId}`);
  revalidatePath("/owner/jobs");
}

export async function cancelStaffApplication(
  applicationId: string,
): Promise<CancelApplicationResult> {
  if (!isUuid(applicationId)) {
    return { ok: false, message: "지원서 정보를 확인할 수 없습니다." };
  }

  const user = await getCurrentAuthUser();
  if (!user) {
    return {
      ok: false,
      message: "지원 취소는 로그인 후 사용할 수 있습니다.",
      redirectTo: "/",
    };
  }

  const profile = await getProfileById(user.id);
  if (!profile) {
    return {
      ok: false,
      message: "역할 선택 후 지원 취소를 사용할 수 있습니다.",
      redirectTo: "/onboarding/role",
    };
  }
  if (profile.role !== "staff") {
    return {
      ok: false,
      message: "스탭 계정에서만 지원 취소를 사용할 수 있습니다.",
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data: current, error: currentError } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .eq("staff_id", profile.id)
    .maybeSingle();

  if (currentError) {
    console.error("[staff/applications/actions] lookup failed", {
      applicationId,
      staffId: profile.id,
      message: currentError.message,
      code: currentError.code,
      details: currentError.details,
    });
    return {
      ok: false,
      message: "지원서를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  if (!current) {
    return { ok: false, message: "지원서를 찾을 수 없습니다." };
  }

  const application = current as Application;
  if (application.status === "canceled") {
    return { ok: false, message: "이미 취소된 지원서입니다." };
  }
  if (application.status === "accepted" || application.status === "rejected") {
    return {
      ok: false,
      message: "채용 결과가 확정된 지원서는 취소할 수 없습니다.",
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("applications")
    .update({ status: "canceled" })
    .eq("id", application.id)
    .eq("staff_id", profile.id)
    .in("status", ["submitted", "viewed"])
    .select("*")
    .maybeSingle();

  if (updateError) {
    console.error("[staff/applications/actions] cancel update failed", {
      applicationId,
      staffId: profile.id,
      message: updateError.message,
      code: updateError.code,
      details: updateError.details,
    });
    return {
      ok: false,
      message: "지원 취소에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  if (!updated) {
    return {
      ok: false,
      message: "현재 상태에서는 지원을 취소할 수 없습니다.",
    };
  }

  const { error: logError } = await supabase.from("application_status_logs").insert({
    application_id: application.id,
    changed_by: profile.id,
    from_status: application.status,
    to_status: "canceled",
    memo: "스탭 지원 취소",
  });

  if (logError) {
    console.error("[staff/applications/actions] cancel log failed", {
      applicationId,
      staffId: profile.id,
      message: logError.message,
      code: logError.code,
      details: logError.details,
    });
    revalidateApplicationViews(application.id);
    return {
      ok: false,
      message: "지원은 취소되었지만 상태 로그 기록에 실패했습니다.",
    };
  }

  revalidateApplicationViews(application.id);

  return { ok: true, message: "지원이 취소되었습니다." };
}

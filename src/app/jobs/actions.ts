"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/uuid";

export type FavoriteActionResult =
  | { ok: true; isFavorited: boolean; message: string }
  | { ok: false; message: string; redirectTo?: string };

export async function toggleFavoriteGuesthouse(
  guesthouseId: string,
): Promise<FavoriteActionResult> {
  if (!isUuid(guesthouseId)) {
    return { ok: false, message: "게스트하우스 정보를 확인할 수 없습니다." };
  }

  const user = await getCurrentAuthUser();
  if (!user) {
    return {
      ok: false,
      message: "관심 게스트하우스 저장은 로그인 후 사용할 수 있습니다.",
      redirectTo: "/",
    };
  }

  const profile = await getProfileById(user.id);
  if (!profile) {
    return {
      ok: false,
      message: "역할 선택 후 관심 게스트하우스를 저장할 수 있습니다.",
      redirectTo: "/onboarding/role",
    };
  }
  if (profile.role === "owner") {
    return {
      ok: false,
      message: "사장님 계정에서는 관심 게스트하우스를 저장할 수 없습니다.",
    };
  }
  if (profile.role !== "staff") {
    return {
      ok: false,
      message: "스탭 계정에서만 관심 게스트하우스를 저장할 수 있습니다.",
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data: guesthouse, error: guesthouseError } = await supabase
    .from("guesthouses")
    .select("id")
    .eq("id", guesthouseId)
    .maybeSingle();

  if (guesthouseError) {
    console.error("[jobs/actions] guesthouse lookup failed", guesthouseError);
    return {
      ok: false,
      message: "게스트하우스 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
  if (!guesthouse) {
    return { ok: false, message: "존재하지 않는 게스트하우스입니다." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("staff_favorite_guesthouses")
    .select("id")
    .eq("staff_id", profile.id)
    .eq("guesthouse_id", guesthouseId)
    .maybeSingle();

  if (existingError) {
    console.error("[jobs/actions] favorite lookup failed", existingError);
    return {
      ok: false,
      message: "관심 저장 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  if (existing) {
    const { error } = await supabase
      .from("staff_favorite_guesthouses")
      .delete()
      .eq("id", existing.id)
      .eq("staff_id", profile.id);

    if (error) {
      console.error("[jobs/actions] favorite delete failed", error);
      return {
        ok: false,
        message: "관심 게스트하우스 해제에 실패했습니다. 잠시 후 다시 시도해주세요.",
      };
    }

    revalidatePath("/jobs");
    revalidatePath("/staff/favorites");
    return { ok: true, isFavorited: false, message: "관심 게스트하우스에서 해제했습니다." };
  }

  const { error: insertError } = await supabase
    .from("staff_favorite_guesthouses")
    .insert({ staff_id: profile.id, guesthouse_id: guesthouseId });

  if (insertError) {
    console.error("[jobs/actions] favorite insert failed", insertError);
    return {
      ok: false,
      message: "관심 게스트하우스 저장에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  revalidatePath("/jobs");
  revalidatePath("/staff/favorites");
  return { ok: true, isFavorited: true, message: "관심 게스트하우스로 저장했습니다." };
}

export async function checkApplyAvailability(slug: string): Promise<{
  ok: boolean;
  message: string;
  redirectTo?: string;
}> {
  const user = await getCurrentAuthUser();
  if (!user) {
    return {
      ok: false,
      message: "지원하려면 로그인이 필요합니다.",
      redirectTo: "/",
    };
  }

  const profile = await getProfileById(user.id);
  if (!profile) {
    return {
      ok: false,
      message: "역할 선택 후 지원할 수 있습니다.",
      redirectTo: "/onboarding/role",
    };
  }
  if (profile.role === "owner") {
    return {
      ok: false,
      message: "사장님 계정에서는 지원 기능을 사용할 수 없습니다.",
    };
  }
  if (profile.role !== "staff") {
    return {
      ok: false,
      message: "스탭 계정에서만 지원할 수 있습니다.",
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data: jobPost, error: jobPostError } = await supabase
    .from("job_posts")
    .select("status")
    .eq("slug", slug)
    .maybeSingle();

  if (jobPostError) {
    console.error("[jobs/actions] apply job lookup failed", {
      slug,
      message: jobPostError.message,
      code: jobPostError.code,
      details: jobPostError.details,
    });
    return {
      ok: false,
      message: "모집글을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
  if (!jobPost) {
    return {
      ok: false,
      message: "존재하지 않는 모집글입니다.",
      redirectTo: "/jobs",
    };
  }
  if (jobPost.status === "closed") {
    return {
      ok: false,
      message: "이미 마감된 공고입니다.",
    };
  }
  if (jobPost.status !== "open") {
    return {
      ok: false,
      message: "모집이 종료된 공고입니다.",
    };
  }

  return {
    ok: true,
    message: "지원서를 작성해주세요.",
    redirectTo: `/jobs/${slug}/apply`,
  };
}

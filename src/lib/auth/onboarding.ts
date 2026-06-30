import "server-only";

import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseCookieClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";

export type OnboardingDestination =
  | "/"
  | "/onboarding/role"
  | "/onboarding/owner/guesthouse"
  | "/onboarding/owner/job-post"
  | "/owner"
  | "/staff/applications"
  | "/staff/coming-soon";

export async function getCurrentAuthUser(): Promise<User | null> {
  const supabase = await createSupabaseCookieClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[auth/onboarding] get current user failed", {
      message: error.message,
      name: error.name,
    });
    return null;
  }

  return user;
}

export async function getProfileById(userId: string): Promise<Profile | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[auth/onboarding] profile lookup failed", {
      userId,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`profile 조회에 실패했습니다: ${error.message}`);
  }

  return (data as Profile | null) ?? null;
}

export function getDefaultProfileName(user: User): string {
  const metadataName =
    typeof user.user_metadata.name === "string"
      ? user.user_metadata.name
      : typeof user.user_metadata.full_name === "string"
        ? user.user_metadata.full_name
        : null;

  if (metadataName?.trim()) return metadataName.trim();
  if (user.email?.includes("@")) return user.email.split("@")[0];
  return "사용자";
}

export async function createProfileForUser(
  user: User,
  role: Exclude<UserRole, "admin">,
): Promise<Profile> {
  const existing = await getProfileById(user.id);
  if (existing) return existing;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      role,
      email: user.email ?? null,
      name: getDefaultProfileName(user),
      phone: null,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[auth/onboarding] profile insert failed", {
      userId: user.id,
      role,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`profile 생성에 실패했습니다: ${error.message}`);
  }
  if (!data) {
    throw new Error("profile 생성 결과가 없습니다.");
  }

  return data as Profile;
}

export async function getOwnerOnboardingDestination(
  ownerId: string,
): Promise<OnboardingDestination> {
  const supabase = createSupabaseAdminClient();
  const { data: guesthouse, error: guesthouseError } = await supabase
    .from("guesthouses")
    .select("id")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (guesthouseError) {
    console.error("[auth/onboarding] guesthouse lookup failed", {
      ownerId,
      message: guesthouseError.message,
      code: guesthouseError.code,
      details: guesthouseError.details,
      hint: guesthouseError.hint,
    });
    throw new Error(`guesthouse 조회에 실패했습니다: ${guesthouseError.message}`);
  }

  if (!guesthouse) return "/onboarding/owner/guesthouse";

  const { data: jobPost, error: jobPostError } = await supabase
    .from("job_posts")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("guesthouse_id", guesthouse.id)
    .neq("status", "hidden")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (jobPostError) {
    console.error("[auth/onboarding] job post lookup failed", {
      ownerId,
      guesthouseId: guesthouse.id,
      message: jobPostError.message,
      code: jobPostError.code,
      details: jobPostError.details,
      hint: jobPostError.hint,
    });
    throw new Error(`job_post 조회에 실패했습니다: ${jobPostError.message}`);
  }

  if (!jobPost) return "/onboarding/owner/job-post";
  return "/owner";
}

export async function getPostLoginDestination(
  userId: string,
): Promise<OnboardingDestination> {
  const profile = await getProfileById(userId);

  if (!profile) return "/onboarding/role";
  if (profile.role === "staff") return "/staff/applications";
  if (profile.role !== "owner") return "/";

  return getOwnerOnboardingDestination(profile.id);
}

export async function getCurrentUserDestination(): Promise<{
  user: User | null;
  destination: OnboardingDestination;
}> {
  const user = await getCurrentAuthUser();
  if (!user) return { user: null, destination: "/" };

  return {
    user,
    destination: await getPostLoginDestination(user.id),
  };
}

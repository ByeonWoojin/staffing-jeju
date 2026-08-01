"use server";

import { redirect } from "next/navigation";
import {
  createProfileForUserWithStatus,
  getCurrentAuthUser,
  getOwnerOnboardingDestination,
} from "@/lib/auth/onboarding";
import {
  appendAuthEventParams,
  AUTH_REDIRECT_PARAM,
  getSafeInternalRedirectPath,
} from "@/lib/auth/redirect";
import type { UserRole } from "@/types/database";

async function chooseRole(
  role: Exclude<UserRole, "admin">,
  formData?: FormData,
) {
  const redirectPath = getSafeInternalRedirectPath(
    formData?.get(AUTH_REDIRECT_PARAM),
  );
  const user = await getCurrentAuthUser();
  if (!user) {
    redirect("/");
  }

  const { profile, isNewUser } = await createProfileForUserWithStatus(user, role);
  const authEvent = isNewUser ? "sign_up" : "login";

  if (
    redirectPath &&
    (profile.role === "staff" || profile.role === "owner")
  ) {
    redirect(appendAuthEventParams(redirectPath, authEvent, profile.role));
  }

  if (profile.role === "staff") {
    redirect(`/jobs?auth_event=${authEvent}&user_role=staff`);
  }

  const destination = await getOwnerOnboardingDestination(profile.id);
  redirect(`${destination}?auth_event=${authEvent}&user_role=owner`);
}

export async function chooseOwnerRole(formData: FormData) {
  await chooseRole("owner", formData);
}

export async function chooseStaffRole(formData: FormData) {
  await chooseRole("staff", formData);
}

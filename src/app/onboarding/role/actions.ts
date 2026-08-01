"use server";

import { redirect } from "next/navigation";
import {
  createProfileForUserWithStatus,
  getCurrentAuthUser,
  getOwnerOnboardingDestination,
} from "@/lib/auth/onboarding";
import {
  appendAuthEventParams,
  appendRedirectParam,
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

  if (profile.role === "staff") {
    if (redirectPath) {
      redirect(appendAuthEventParams(redirectPath, authEvent, "staff"));
    }

    redirect(`/jobs?auth_event=${authEvent}&user_role=staff`);
  }

  const destination = await getOwnerOnboardingDestination(profile.id);
  if (redirectPath) {
    const nextDestination =
      destination === "/owner"
        ? redirectPath
        : appendRedirectParam(destination, redirectPath);

    redirect(appendAuthEventParams(nextDestination, authEvent, "owner"));
  }

  redirect(appendAuthEventParams(destination, authEvent, "owner"));
}

export async function chooseOwnerRole(formData: FormData) {
  await chooseRole("owner", formData);
}

export async function chooseStaffRole(formData: FormData) {
  await chooseRole("staff", formData);
}

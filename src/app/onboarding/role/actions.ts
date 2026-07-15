"use server";

import { redirect } from "next/navigation";
import {
  createProfileForUserWithStatus,
  getCurrentAuthUser,
  getOwnerOnboardingDestination,
} from "@/lib/auth/onboarding";
import type { UserRole } from "@/types/database";

async function chooseRole(role: Exclude<UserRole, "admin">) {
  const user = await getCurrentAuthUser();
  if (!user) {
    redirect("/");
  }

  const { profile, isNewUser } = await createProfileForUserWithStatus(user, role);
  const authEvent = isNewUser ? "sign_up" : "login";

  if (profile.role === "staff") {
    redirect(`/jobs?auth_event=${authEvent}&user_role=staff`);
  }

  const destination = await getOwnerOnboardingDestination(profile.id);
  redirect(`${destination}?auth_event=${authEvent}&user_role=owner`);
}

export async function chooseOwnerRole() {
  await chooseRole("owner");
}

export async function chooseStaffRole() {
  await chooseRole("staff");
}

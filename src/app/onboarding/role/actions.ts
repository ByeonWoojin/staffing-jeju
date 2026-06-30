"use server";

import { redirect } from "next/navigation";
import {
  createProfileForUser,
  getCurrentAuthUser,
  getOwnerOnboardingDestination,
} from "@/lib/auth/onboarding";
import type { UserRole } from "@/types/database";

async function chooseRole(role: Exclude<UserRole, "admin">) {
  const user = await getCurrentAuthUser();
  if (!user) {
    redirect("/");
  }

  const profile = await createProfileForUser(user, role);

  if (profile.role === "staff") {
    redirect("/jobs");
  }

  const destination = await getOwnerOnboardingDestination(profile.id);
  redirect(destination);
}

export async function chooseOwnerRole() {
  await chooseRole("owner");
}

export async function chooseStaffRole() {
  await chooseRole("staff");
}

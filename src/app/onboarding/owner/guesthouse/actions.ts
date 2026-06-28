"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import type { Guesthouse, GuesthouseFormData } from "@/types/database";

type NewGuesthouseValues = Pick<
  Guesthouse,
  | "owner_id"
  | "name"
  | "region"
  | "address_text"
  | "map_url"
  | "contact_method"
  | "description"
>;

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

function normalizePayload(
  ownerId: string,
  payload: GuesthouseFormData,
): NewGuesthouseValues {
  return {
    owner_id: ownerId,
    name: normalizeRequiredText(payload.name, "게스트하우스명"),
    region: normalizeRequiredText(payload.region, "지역"),
    address_text: normalizeRequiredText(payload.address_text, "주소"),
    map_url: normalizeOptionalText(payload.map_url),
    contact_method: normalizeRequiredText(payload.contact_method, "연락 수단"),
    description: normalizeOptionalText(payload.description),
  };
}

async function getOwnerIdOrRedirect(): Promise<string | null> {
  const user = await getCurrentAuthUser();
  if (!user) return null;

  const profile = await getProfileById(user.id);
  if (!profile || profile.role !== "owner") return null;

  return profile.id;
}

export async function createOwnerGuesthouse(
  payload: GuesthouseFormData,
): Promise<string> {
  const ownerId = await getOwnerIdOrRedirect();
  if (!ownerId) return "/";

  const supabase = createSupabaseAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("guesthouses")
    .select("id")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`게스트하우스 조회에 실패했습니다: ${existingError.message}`);
  }

  if (existing) {
    return "/onboarding/owner/job-post";
  }

  const values = normalizePayload(ownerId, payload);
  const { error } = await supabase.from("guesthouses").insert(values);

  if (error) {
    throw new Error(`게스트하우스 등록에 실패했습니다: ${error.message}`);
  }

  revalidatePath("/onboarding/owner/guesthouse");
  revalidatePath("/onboarding/owner/job-post");
  revalidatePath("/owner");
  return "/onboarding/owner/job-post";
}

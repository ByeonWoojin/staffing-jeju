"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/uuid";
import type { Guesthouse, GuesthouseFormData, Profile } from "@/types/database";

type EditableGuesthouseUpdate = Pick<
  Guesthouse,
  "name" | "region" | "address_text" | "map_url" | "contact_method"
>;

const INVALID_GUESTHOUSE_ID_MESSAGE =
  "개발용 mock 데이터에서는 저장할 수 없습니다. Supabase guesthouses.id UUID를 사용해야 합니다.";

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

function logAction(
  actionName: string,
  guesthouseId: string,
  payload: Record<string, unknown>,
) {
  console.log(`[owner/guesthouse/edit/actions] ${actionName}`, {
    guesthouseId,
    ...payload,
  });
}

function assertValidGuesthouseId(guesthouseId: string) {
  if (!isUuid(guesthouseId)) {
    throw new Error(INVALID_GUESTHOUSE_ID_MESSAGE);
  }
}

function logUuidValidation(actionName: string, guesthouseId: string) {
  console.log(`[${actionName}] uuid validation`, {
    guesthouseId,
    isValidUuid: isUuid(guesthouseId),
  });
}

async function getCurrentOwnerOrThrow(): Promise<Profile> {
  const supabase = createSupabaseAdminClient();
  const devOwnerId = process.env.NEXT_PUBLIC_DEV_OWNER_ID;
  const baseQuery = supabase.from("profiles").select("*").eq("role", "owner");
  const query = devOwnerId
    ? baseQuery.eq("id", devOwnerId)
    : baseQuery.order("created_at", { ascending: true }).limit(1);

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("[owner/guesthouse/edit/actions] get owner error", {
      error: serializeSupabaseError(error),
    });
    throw new Error(`owner profile 조회에 실패했습니다: ${error.message}`);
  }
  if (!data) {
    throw new Error(
      devOwnerId
        ? `NEXT_PUBLIC_DEV_OWNER_ID=${devOwnerId}에 해당하는 owner profile이 없습니다.`
        : "role='owner' profile이 없습니다.",
    );
  }

  return data as Profile;
}

async function getGuesthouseOrThrow(guesthouseId: string): Promise<Guesthouse> {
  assertValidGuesthouseId(guesthouseId);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("guesthouses")
    .select("*")
    .eq("id", guesthouseId)
    .maybeSingle();

  if (error) {
    logAction("getGuesthouseOrThrow:error", guesthouseId, {
      error: serializeSupabaseError(error),
    });
    throw new Error(`게스트하우스 조회에 실패했습니다: ${error.message}`);
  }
  if (!data) {
    logAction("getGuesthouseOrThrow:no-row", guesthouseId, {});
    throw new Error("게스트하우스를 찾을 수 없습니다.");
  }

  logAction("getGuesthouseOrThrow:success", guesthouseId, { result: data });
  return data as Guesthouse;
}

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
  payload: GuesthouseFormData,
): EditableGuesthouseUpdate {
  return {
    name: normalizeRequiredText(payload.name, "게스트하우스명"),
    region: normalizeRequiredText(payload.region, "지역"),
    address_text: normalizeRequiredText(payload.address_text, "주소"),
    map_url: normalizeOptionalText(payload.map_url),
    contact_method: normalizeRequiredText(payload.contact_method, "연락 수단"),
  };
}

function stringifyValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function hasChanges(
  before: Guesthouse,
  nextValues: EditableGuesthouseUpdate,
): boolean {
  return (
    stringifyValue(before.name) !== stringifyValue(nextValues.name) ||
    stringifyValue(before.region) !== stringifyValue(nextValues.region) ||
    stringifyValue(before.address_text) !==
      stringifyValue(nextValues.address_text) ||
    stringifyValue(before.map_url) !== stringifyValue(nextValues.map_url) ||
    stringifyValue(before.contact_method) !==
      stringifyValue(nextValues.contact_method)
  );
}

export async function updateGuesthouse(
  guesthouseId: string,
  payload: GuesthouseFormData,
): Promise<Guesthouse> {
  console.log("[updateGuesthouse] called", guesthouseId);
  logUuidValidation("updateGuesthouse", guesthouseId);
  assertValidGuesthouseId(guesthouseId);

  const owner = await getCurrentOwnerOrThrow();
  const current = await getGuesthouseOrThrow(guesthouseId);

  if (current.owner_id !== owner.id) {
    logAction("updateGuesthouse:owner:error", guesthouseId, {
      ownerId: owner.id,
      guesthouseOwnerId: current.owner_id,
    });
    throw new Error("현재 owner가 수정할 수 있는 게스트하우스가 아닙니다.");
  }

  const values = normalizePayload(payload);
  if (!hasChanges(current, values)) {
    logAction("updateGuesthouse:no-changes", guesthouseId, { values });
    throw new Error("변경된 내용이 없습니다.");
  }

  const supabase = createSupabaseAdminClient();
  logAction("updateGuesthouse:update:start", guesthouseId, { values });

  const { data, error } = await supabase
    .from("guesthouses")
    .update(values)
    .eq("id", guesthouseId)
    .select("*")
    .maybeSingle();

  if (error) {
    logAction("updateGuesthouse:update:error", guesthouseId, {
      error: serializeSupabaseError(error),
    });
    throw new Error(`게스트하우스 수정에 실패했습니다: ${error.message}`);
  }
  if (!data) {
    logAction("updateGuesthouse:update:no-row", guesthouseId, { values });
    throw new Error(
      "게스트하우스 수정 결과가 없습니다. DB row가 수정되지 않았습니다.",
    );
  }

  const updated = data as Guesthouse;
  logAction("updateGuesthouse:update:success", guesthouseId, {
    before: current,
    result: updated,
  });

  revalidatePath("/owner");
  revalidatePath("/owner/guesthouse");
  revalidatePath("/owner/guesthouse/edit");

  logAction("updateGuesthouse:done", guesthouseId, {
    before: current,
    result: updated,
  });
  return updated;
}

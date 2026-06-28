"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import { isUuid } from "@/lib/uuid";
import type {
  Guesthouse,
  GuesthouseFormData,
  GuesthousePhoto,
  Profile,
} from "@/types/database";

type EditableGuesthouseUpdate = Pick<
  Guesthouse,
  | "name"
  | "region"
  | "address_text"
  | "map_url"
  | "contact_method"
  | "description"
>;

const INVALID_GUESTHOUSE_ID_MESSAGE =
  "개발용 mock 데이터에서는 저장할 수 없습니다. Supabase guesthouses.id UUID를 사용해야 합니다.";
const GUESTHOUSE_IMAGE_BUCKET = "guesthouse-images";
const MAX_PHOTO_COUNT = 5;
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

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
  const authUser = await getCurrentAuthUser();
  if (!authUser) {
    throw new Error("로그인이 필요합니다.");
  }

  const profile = await getProfileById(authUser.id);
  if (!profile || profile.role !== "owner") {
    throw new Error("사장님 계정만 실행할 수 있는 작업입니다.");
  }

  return profile;
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
    description: normalizeOptionalText(payload.description),
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
      stringifyValue(nextValues.contact_method) ||
    stringifyValue(before.description) !==
      stringifyValue(nextValues.description)
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

function getPhotoExtension(file: File): string {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

async function getGuesthousePhotoOrThrow(
  photoId: string,
): Promise<GuesthousePhoto> {
  if (!isUuid(photoId)) {
    throw new Error("사진 ID가 올바르지 않습니다.");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("guesthouse_photos")
    .select("*")
    .eq("id", photoId)
    .maybeSingle();

  if (error) {
    throw new Error(`사진 조회에 실패했습니다: ${error.message}`);
  }
  if (!data) {
    throw new Error("사진을 찾을 수 없습니다.");
  }

  return data as GuesthousePhoto;
}

export async function uploadGuesthousePhoto(
  formData: FormData,
): Promise<void> {
  const guesthouseId = String(formData.get("guesthouseId") ?? "");
  const file = formData.get("photo");

  assertValidGuesthouseId(guesthouseId);
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("업로드할 사진을 선택해주세요.");
  }
  if (!ALLOWED_PHOTO_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_TYPES)[number])) {
    throw new Error("JPG, PNG, WEBP 형식의 이미지만 업로드할 수 있습니다.");
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    throw new Error("사진은 1장당 최대 5MB까지만 업로드할 수 있습니다.");
  }

  const owner = await getCurrentOwnerOrThrow();
  const guesthouse = await getGuesthouseOrThrow(guesthouseId);
  if (guesthouse.owner_id !== owner.id) {
    throw new Error("현재 owner가 수정할 수 있는 게스트하우스가 아닙니다.");
  }

  const supabase = createSupabaseAdminClient();
  const { count, error: countError } = await supabase
    .from("guesthouse_photos")
    .select("id", { count: "exact", head: true })
    .eq("guesthouse_id", guesthouseId);

  if (countError) {
    console.error("[uploadGuesthousePhoto] count failed", {
      error: serializeSupabaseError(countError),
    });
    throw new Error("사진 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }
  if ((count ?? 0) >= MAX_PHOTO_COUNT) {
    throw new Error("게스트하우스 사진은 최대 5장까지 등록할 수 있습니다.");
  }

  const ext = getPhotoExtension(file);
  const photoPath = `guesthouses/${guesthouseId}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(GUESTHOUSE_IMAGE_BUCKET)
    .upload(photoPath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[uploadGuesthousePhoto] storage upload failed", {
      error: serializeSupabaseError(uploadError),
    });
    throw new Error("사진 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }

  const { error: insertError } = await supabase
    .from("guesthouse_photos")
    .insert({
      guesthouse_id: guesthouseId,
      owner_id: owner.id,
      photo_path: photoPath,
      alt_text: guesthouse.name,
      sort_order: count ?? 0,
    });

  if (insertError) {
    await supabase.storage.from(GUESTHOUSE_IMAGE_BUCKET).remove([photoPath]);
    console.error("[uploadGuesthousePhoto] insert failed", {
      error: serializeSupabaseError(insertError),
    });
    throw new Error("사진 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }

  revalidatePath("/owner");
  revalidatePath("/owner/guesthouse/edit");
}

export async function deleteGuesthousePhoto(photoId: string): Promise<void> {
  const owner = await getCurrentOwnerOrThrow();
  const photo = await getGuesthousePhotoOrThrow(photoId);

  if (photo.owner_id !== owner.id) {
    throw new Error("현재 owner가 삭제할 수 있는 사진이 아닙니다.");
  }

  const supabase = createSupabaseAdminClient();
  const { error: removeError } = await supabase.storage
    .from(GUESTHOUSE_IMAGE_BUCKET)
    .remove([photo.photo_path]);

  if (removeError) {
    console.error("[deleteGuesthousePhoto] storage remove failed", {
      error: serializeSupabaseError(removeError),
    });
    throw new Error("사진 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }

  const { error: deleteError } = await supabase
    .from("guesthouse_photos")
    .delete()
    .eq("id", photo.id)
    .eq("owner_id", owner.id);

  if (deleteError) {
    console.error("[deleteGuesthousePhoto] delete failed", {
      error: serializeSupabaseError(deleteError),
    });
    throw new Error("사진 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }

  revalidatePath("/owner");
  revalidatePath("/owner/guesthouse/edit");
}

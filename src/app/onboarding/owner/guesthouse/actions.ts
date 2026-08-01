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

const GUESTHOUSE_IMAGE_BUCKET = "guesthouse-images";
const MAX_PHOTO_COUNT = 5;

export interface CreateOwnerGuesthouseResult {
  success: boolean;
  code:
    | "SUCCESS"
    | "VALIDATION_ERROR"
    | "UNAUTHORIZED"
    | "ALREADY_EXISTS"
    | "UPDATE_FAILED";
  message: string;
  redirectTo?: string;
  guesthouseId?: string;
  created: boolean;
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

function actionResult(
  code: CreateOwnerGuesthouseResult["code"],
  message: string,
  options: Partial<Omit<CreateOwnerGuesthouseResult, "success" | "code" | "message">> = {},
): CreateOwnerGuesthouseResult {
  return {
    success: code === "SUCCESS",
    code,
    message,
    created: false,
    ...options,
  };
}

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

function isValidUploadedPhotoPath(path: string, ownerId: string) {
  return (
    path.startsWith(`${ownerId}/guesthouses/`) &&
    /\.(jpe?g|png|webp)$/i.test(path)
  );
}

function normalizeUploadedPhotoPaths(paths: string[] | undefined, ownerId: string) {
  const normalizedPaths = (paths ?? [])
    .map((path) => path.trim())
    .filter(Boolean);
  const uniquePaths = Array.from(new Set(normalizedPaths));

  if (uniquePaths.length > MAX_PHOTO_COUNT) {
    throw new Error(
      "사진은 최대 5장까지 등록할 수 있습니다. 현재 추가할 수 있는 사진은 5장입니다.",
    );
  }
  if (uniquePaths.length !== normalizedPaths.length) {
    throw new Error("같은 사진이 중복 선택됐어요.");
  }
  if (uniquePaths.some((path) => !isValidUploadedPhotoPath(path, ownerId))) {
    throw new Error("사진 업로드 정보가 올바르지 않습니다.");
  }

  return uniquePaths;
}

async function cleanupUploadedPhotoPaths(paths: string[]) {
  if (paths.length === 0) return;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(GUESTHOUSE_IMAGE_BUCKET)
    .remove(paths);

  if (error) {
    console.error("[createOwnerGuesthouse] storage cleanup failed", {
      path_count: paths.length,
      error: serializeSupabaseError(error),
    });
  }
}

export async function createOwnerGuesthouse(
  payload: GuesthouseFormData,
  uploadedPhotoPaths?: string[],
): Promise<CreateOwnerGuesthouseResult> {
  const ownerId = await getOwnerIdOrRedirect();
  if (!ownerId) {
    return actionResult("UNAUTHORIZED", "로그인이 필요합니다.", {
      redirectTo: "/",
    });
  }

  const supabase = createSupabaseAdminClient();
  let photoPaths: string[];
  try {
    photoPaths = normalizeUploadedPhotoPaths(uploadedPhotoPaths, ownerId);
  } catch (error) {
    await cleanupUploadedPhotoPaths(uploadedPhotoPaths ?? []);
    return actionResult(
      "VALIDATION_ERROR",
      error instanceof Error ? error.message : "사진 업로드 정보가 올바르지 않습니다.",
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("guesthouses")
    .select("id")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (existingError) {
    await cleanupUploadedPhotoPaths(photoPaths);
    console.error("[createOwnerGuesthouse] existing lookup failed", {
      user_id: ownerId,
      error: serializeSupabaseError(existingError),
    });
    return actionResult(
      "UPDATE_FAILED",
      "게스트하우스 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  if (existing) {
    await cleanupUploadedPhotoPaths(photoPaths);
    return actionResult(
      "ALREADY_EXISTS",
      "이미 등록된 게스트하우스가 있습니다.",
      {
        redirectTo: "/onboarding/owner/job-post",
      },
    );
  }

  let values: NewGuesthouseValues;
  try {
    values = normalizePayload(ownerId, payload);
  } catch (error) {
    await cleanupUploadedPhotoPaths(photoPaths);
    return actionResult(
      "VALIDATION_ERROR",
      error instanceof Error ? error.message : "입력값을 확인해 주세요.",
    );
  }

  const { data: createdGuesthouse, error } = await supabase
    .from("guesthouses")
    .insert(values)
    .select("id, name")
    .maybeSingle();

  if (error) {
    await cleanupUploadedPhotoPaths(photoPaths);
    console.error("[createOwnerGuesthouse] insert failed", {
      user_id: ownerId,
      error: serializeSupabaseError(error),
    });
    return actionResult(
      "UPDATE_FAILED",
      "게스트하우스 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }
  if (!createdGuesthouse) {
    await cleanupUploadedPhotoPaths(photoPaths);
    return actionResult(
      "UPDATE_FAILED",
      "게스트하우스 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  try {
    if (photoPaths.length > 0) {
      const rows = photoPaths.map((photoPath, index) => ({
        guesthouse_id: createdGuesthouse.id,
        owner_id: ownerId,
        photo_path: photoPath,
        alt_text: createdGuesthouse.name,
        sort_order: index,
      }));
      const { error: insertPhotoError } = await supabase
        .from("guesthouse_photos")
        .insert(rows);

      if (insertPhotoError) {
        throw insertPhotoError;
      }
    }
  } catch (photoError) {
    await cleanupUploadedPhotoPaths(photoPaths);
    await supabase
      .from("guesthouses")
      .delete()
      .eq("id", createdGuesthouse.id)
      .eq("owner_id", ownerId);
    console.error("[createOwnerGuesthouse] photo metadata insert failed", {
      user_id: ownerId,
      guesthouse_id: createdGuesthouse.id,
      error: serializeSupabaseError(photoError),
    });
    return actionResult(
      "UPDATE_FAILED",
      "게스트하우스 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  revalidatePath("/onboarding/owner/guesthouse");
  revalidatePath("/onboarding/owner/job-post");
  revalidatePath("/owner");
  return actionResult("SUCCESS", "게스트하우스 정보가 저장되었습니다.", {
    redirectTo: "/onboarding/owner/job-post",
    guesthouseId: createdGuesthouse.id,
    created: true,
  });
}

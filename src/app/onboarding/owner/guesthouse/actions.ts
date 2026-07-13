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
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

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

function getPhotoExtension(file: File): string {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function getFileSignature(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function assertValidPhotoFile(file: File) {
  if (
    !ALLOWED_PHOTO_TYPES.includes(
      file.type as (typeof ALLOWED_PHOTO_TYPES)[number],
    )
  ) {
    throw new Error("JPG, PNG, WEBP 형식의 이미지만 등록할 수 있어요.");
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    throw new Error("사진 한 장의 용량은 5MB 이하여야 해요.");
  }
}

function getValidPhotoFiles(photoFormData?: FormData): File[] {
  if (!photoFormData) return [];

  const photoFiles = photoFormData.getAll("photos").flatMap((file) =>
    file instanceof File && file.size > 0 ? [file] : [],
  );
  if (photoFiles.length > MAX_PHOTO_COUNT) {
    throw new Error("사진은 최대 5장까지 등록할 수 있어요.");
  }

  const signatures = new Set<string>();
  for (const file of photoFiles) {
    const signature = getFileSignature(file);
    if (signatures.has(signature)) {
      throw new Error("같은 파일이 중복 선택됐어요.");
    }
    signatures.add(signature);
    assertValidPhotoFile(file);
  }

  return photoFiles;
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
  photoFormData?: FormData,
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

  const photoFiles = getValidPhotoFiles(photoFormData);
  const values = normalizePayload(ownerId, payload);
  const { data: createdGuesthouse, error } = await supabase
    .from("guesthouses")
    .insert(values)
    .select("id, name")
    .maybeSingle();

  if (error) {
    throw new Error(`게스트하우스 등록에 실패했습니다: ${error.message}`);
  }
  if (!createdGuesthouse) {
    throw new Error("게스트하우스 등록 결과가 없습니다.");
  }

  const uploadedPaths: string[] = [];
  try {
    const rows = [];
    for (const [index, file] of photoFiles.entries()) {
      const ext = getPhotoExtension(file);
      const photoPath = `guesthouses/${createdGuesthouse.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(GUESTHOUSE_IMAGE_BUCKET)
        .upload(photoPath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          `게스트하우스 사진 업로드에 실패했습니다: ${uploadError.message}`,
        );
      }

      uploadedPaths.push(photoPath);
      rows.push({
        guesthouse_id: createdGuesthouse.id,
        owner_id: ownerId,
        photo_path: photoPath,
        alt_text: createdGuesthouse.name,
        sort_order: index,
      });
    }

    if (rows.length > 0) {
      const { error: insertPhotoError } = await supabase
        .from("guesthouse_photos")
        .insert(rows);

      if (insertPhotoError) {
        throw new Error(
          `게스트하우스 사진 저장에 실패했습니다: ${insertPhotoError.message}`,
        );
      }
    }
  } catch (photoError) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(GUESTHOUSE_IMAGE_BUCKET).remove(uploadedPaths);
    }
    await supabase
      .from("guesthouses")
      .delete()
      .eq("id", createdGuesthouse.id)
      .eq("owner_id", ownerId);
    throw photoError;
  }

  revalidatePath("/onboarding/owner/guesthouse");
  revalidatePath("/onboarding/owner/job-post");
  revalidatePath("/owner");
  return "/onboarding/owner/job-post";
}

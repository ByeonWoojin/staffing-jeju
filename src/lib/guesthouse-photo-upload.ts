"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const GUESTHOUSE_IMAGE_BUCKET = "guesthouse-images";
export const GUESTHOUSE_PHOTO_MAX_COUNT = 5;
export const GUESTHOUSE_PHOTO_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const GUESTHOUSE_PHOTO_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
const GUESTHOUSE_PHOTO_ALLOWED_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
] as const;

export type GuesthousePhotoUploadFile = {
  clientId: string;
  file: File;
};

export type UploadedGuesthousePhoto = {
  clientId: string;
  path: string;
};

const FRIENDLY_UPLOAD_ERROR =
  "사진 업로드 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

export function getGuesthousePhotoFileSignature(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function getLowerFileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

function isAllowedPhotoType(type: string) {
  return GUESTHOUSE_PHOTO_ALLOWED_TYPES.includes(
    type as (typeof GUESTHOUSE_PHOTO_ALLOWED_TYPES)[number],
  );
}

function isAllowedPhotoExtension(extension: string) {
  return GUESTHOUSE_PHOTO_ALLOWED_EXTENSIONS.includes(
    extension as (typeof GUESTHOUSE_PHOTO_ALLOWED_EXTENSIONS)[number],
  );
}

export function getGuesthousePhotoFileExtension(file: File) {
  const extension = getLowerFileExtension(file);
  if (isAllowedPhotoExtension(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function getGuesthousePhotoContentType(file: File) {
  if (isAllowedPhotoType(file.type)) return file.type;

  const extension = getGuesthousePhotoFileExtension(file);
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
}

export function validateGuesthousePhotoFile(file: File): string | null {
  const extension = getLowerFileExtension(file);
  const hasAllowedMime = isAllowedPhotoType(file.type);
  const hasAllowedExtension = isAllowedPhotoExtension(extension);

  if (!hasAllowedMime && !hasAllowedExtension) {
    return "JPG, JPEG, PNG, WEBP 형식의 사진만 등록할 수 있습니다.";
  }

  if (file.size > GUESTHOUSE_PHOTO_MAX_SIZE_BYTES) {
    return "사진 한 장의 용량은 최대 5MB까지 가능합니다.";
  }

  return null;
}

export async function removeUploadedGuesthousePhotoPaths(paths: string[]) {
  if (paths.length === 0) return;

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage
    .from(GUESTHOUSE_IMAGE_BUCKET)
    .remove(paths);

  if (error) {
    console.error("[guesthouse-photo-upload] cleanup failed", {
      path_count: paths.length,
      error_code: error.name,
    });
  }
}

export async function uploadGuesthousePhotoFiles(
  files: GuesthousePhotoUploadFile[],
  options: { guesthouseId?: string } = {},
): Promise<UploadedGuesthousePhoto[]> {
  if (files.length === 0) return [];

  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("로그인 정보가 만료되었습니다. 다시 로그인해 주세요.");
  }

  const uploaded: UploadedGuesthousePhoto[] = [];
  try {
    for (const item of files) {
      const validationMessage = validateGuesthousePhotoFile(item.file);
      if (validationMessage) {
        throw new Error(validationMessage);
      }

      const ext = getGuesthousePhotoFileExtension(item.file);
      const guesthouseSegment = options.guesthouseId ?? "pending";
      const path = `${user.id}/guesthouses/${guesthouseSegment}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(GUESTHOUSE_IMAGE_BUCKET)
        .upload(path, item.file, {
          contentType: getGuesthousePhotoContentType(item.file),
          upsert: false,
        });

      if (error) {
        console.error("[guesthouse-photo-upload] upload failed", {
          client_id: item.clientId,
          error_code: error.name,
        });
        throw new Error(FRIENDLY_UPLOAD_ERROR);
      }

      uploaded.push({ clientId: item.clientId, path });
    }
  } catch (error) {
    await removeUploadedGuesthousePhotoPaths(
      uploaded.map((photo) => photo.path),
    );
    throw error instanceof Error ? error : new Error(FRIENDLY_UPLOAD_ERROR);
  }

  return uploaded;
}

import "server-only";

import type { Application } from "@/types/database";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const APPLICATION_PHOTO_BUCKET = "application-photos";
export const MAX_APPLICATION_PHOTO_SIZE = 5 * 1024 * 1024;

const ALLOWED_APPLICATION_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type ApplicationWithPhotoUrl = Application & {
  representativePhotoUrl?: string | null;
};

export function validateApplicationPhoto(file: File | null) {
  if (!file || file.size === 0) {
    return { ok: false as const, message: "대표사진을 등록해주세요." };
  }

  if (file.size > MAX_APPLICATION_PHOTO_SIZE) {
    return {
      ok: false as const,
      message: "사진은 1장당 최대 5MB까지만 업로드할 수 있습니다.",
    };
  }

  if (!ALLOWED_APPLICATION_PHOTO_TYPES.has(file.type)) {
    return {
      ok: false as const,
      message: "JPG, PNG, WEBP 형식의 이미지만 업로드할 수 있습니다.",
    };
  }

  return {
    ok: true as const,
    extension: extensionByMimeType[file.type] ?? "jpg",
  };
}

export function buildApplicationPhotoPath({
  jobPostId,
  staffId,
  extension,
}: {
  jobPostId: string;
  staffId: string;
  extension: string;
}) {
  return `applications/${jobPostId}/${staffId}/${crypto.randomUUID()}.${extension}`;
}

export async function uploadApplicationPhoto(path: string, file: File) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(APPLICATION_PHOTO_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("[application-photo] upload failed", {
      path,
      message: error.message,
    });
    throw new Error("대표사진 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }
}

export async function removeApplicationPhoto(path: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(APPLICATION_PHOTO_BUCKET)
    .remove([path]);

  if (error) {
    console.error("[application-photo] remove failed", {
      path,
      message: error.message,
    });
  }
}

export async function getApplicationPhotoSignedUrl(path: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(APPLICATION_PHOTO_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error) {
    console.error("[application-photo] signed url failed", {
      path,
      message: error.message,
    });
    return null;
  }

  return data.signedUrl;
}

export async function attachApplicationPhotoUrls<T extends Application>(
  applications: T[],
): Promise<ApplicationWithPhotoUrl[]> {
  return Promise.all(
    applications.map(async (application) => ({
      ...application,
      representativePhotoUrl: await getApplicationPhotoSignedUrl(
        application.representative_photo_path,
      ),
    })),
  );
}

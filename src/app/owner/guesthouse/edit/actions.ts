"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import { isUuid } from "@/lib/uuid";
import type {
  Guesthouse,
  GuesthouseFormData,
  GuesthousePhoto,
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

export type GuesthouseUpdateActionCode =
  | "SUCCESS"
  | "NO_CHANGES"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "UPDATE_FAILED";

export type GuesthouseUpdateActionResult = {
  success: boolean;
  code: GuesthouseUpdateActionCode;
  message: string;
};

export type GuesthousePhotoOrderItem =
  | {
      type: "existing";
      id: string;
    }
  | {
      type: "new";
      path: string;
    };

export type GuesthousePhotoUpdatePayload = {
  orderedPhotos: GuesthousePhotoOrderItem[];
  deletedPhotoIds: string[];
  uploadedPhotoPaths: string[];
};

const INVALID_GUESTHOUSE_ID_MESSAGE =
  "개발용 mock 데이터에서는 저장할 수 없습니다. Supabase guesthouses.id UUID를 사용해야 합니다.";
const GUESTHOUSE_IMAGE_BUCKET = "guesthouse-images";
const MAX_PHOTO_COUNT = 5;

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
  console.info(`[owner-guesthouse-edit] ${actionName}`, {
    guesthouse_id: guesthouseId,
    ...payload,
  });
}

function logUuidValidation(actionName: string, guesthouseId: string) {
  void actionName;
  void guesthouseId;
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

function hasTextChanges(
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

function actionResult(
  code: GuesthouseUpdateActionCode,
  message: string,
): GuesthouseUpdateActionResult {
  return {
    success: code === "SUCCESS",
    code,
    message,
  };
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function isValidUploadedPhotoPath(path: string, ownerId: string) {
  return (
    path.startsWith(`${ownerId}/guesthouses/`) &&
    /\.(jpe?g|png|webp)$/i.test(path)
  );
}

function getOrderedExistingIds(photoChanges?: GuesthousePhotoUpdatePayload) {
  return (
    photoChanges?.orderedPhotos.flatMap((photo) =>
      photo.type === "existing" ? [photo.id] : [],
    ) ?? []
  );
}

function getOrderedNewPaths(photoChanges?: GuesthousePhotoUpdatePayload) {
  return (
    photoChanges?.orderedPhotos.flatMap((photo) =>
      photo.type === "new" ? [photo.path] : [],
    ) ?? []
  );
}

function getPhotoPayloadValidationMessage(
  photoChanges: GuesthousePhotoUpdatePayload,
  ownerId: string,
) {
  if (photoChanges.orderedPhotos.length > MAX_PHOTO_COUNT) {
    return "사진은 최대 5장까지 등록할 수 있습니다. 현재 추가할 수 있는 사진은 0장입니다.";
  }

  const orderedExistingIds = getOrderedExistingIds(photoChanges);
  const orderedNewPaths = getOrderedNewPaths(photoChanges);
  const deletedPhotoIds = photoChanges.deletedPhotoIds;
  const uploadedPhotoPaths = photoChanges.uploadedPhotoPaths;

  if (
    uniqueStrings(orderedExistingIds).length !== orderedExistingIds.length ||
    uniqueStrings(orderedNewPaths).length !== orderedNewPaths.length ||
    uniqueStrings(deletedPhotoIds).length !== deletedPhotoIds.length ||
    uniqueStrings(uploadedPhotoPaths).length !== uploadedPhotoPaths.length
  ) {
    return "사진 순서 정보가 올바르지 않습니다.";
  }

  if (
    orderedExistingIds.some((photoId) => !isUuid(photoId)) ||
    deletedPhotoIds.some((photoId) => !isUuid(photoId))
  ) {
    return "사진 순서 정보가 올바르지 않습니다.";
  }

  const orderedNewPathSet = new Set(orderedNewPaths);
  if (uploadedPhotoPaths.some((path) => !orderedNewPathSet.has(path))) {
    return "사진 업로드 정보가 올바르지 않습니다.";
  }

  if (
    [...orderedNewPaths, ...uploadedPhotoPaths].some(
      (path) => !isValidUploadedPhotoPath(path, ownerId),
    )
  ) {
    return "사진 업로드 정보가 올바르지 않습니다.";
  }

  return null;
}

function getPhotoHasChanges(
  currentPhotos: GuesthousePhoto[],
  photoChanges?: GuesthousePhotoUpdatePayload,
) {
  if (!photoChanges) return false;
  if (photoChanges.uploadedPhotoPaths.length > 0) return true;
  if (photoChanges.deletedPhotoIds.length > 0) return true;

  const currentOrder = currentPhotos.map((photo) => photo.id);
  const nextExistingOrder = getOrderedExistingIds(photoChanges);
  if (currentOrder.length !== nextExistingOrder.length) return true;

  return currentOrder.some(
    (photoId, index) => photoId !== nextExistingOrder[index],
  );
}

async function cleanupUploadedPhotoPaths(paths: string[]) {
  if (paths.length === 0) return;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(GUESTHOUSE_IMAGE_BUCKET)
    .remove(paths);

  if (error) {
    console.error("[owner-guesthouse-edit] uploaded photo cleanup failed", {
      path_count: paths.length,
      error: serializeSupabaseError(error),
    });
  }
}

async function removeDeletedPhotoPaths(
  paths: string[],
  ownerId: string,
  guesthouseId: string,
) {
  if (paths.length === 0) return;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(GUESTHOUSE_IMAGE_BUCKET)
    .remove(paths);

  if (error) {
    console.error("[owner-guesthouse-edit] deleted photo cleanup failed", {
      user_id: ownerId,
      guesthouse_id: guesthouseId,
      path_count: paths.length,
      error: serializeSupabaseError(error),
    });
  }
}

async function rollbackInsertedPhotoRows(
  guesthouseId: string,
  ownerId: string,
  paths: string[],
) {
  if (paths.length === 0) return;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("guesthouse_photos")
    .delete()
    .eq("guesthouse_id", guesthouseId)
    .eq("owner_id", ownerId)
    .in("photo_path", paths);

  if (error) {
    console.error("[owner-guesthouse-edit] photo row rollback failed", {
      user_id: ownerId,
      guesthouse_id: guesthouseId,
      path_count: paths.length,
      error: serializeSupabaseError(error),
    });
  }
}

export async function updateGuesthouse(
  guesthouseId: string,
  payload: GuesthouseFormData,
  photoChanges?: GuesthousePhotoUpdatePayload,
): Promise<GuesthouseUpdateActionResult> {
  logUuidValidation("updateGuesthouse", guesthouseId);

  if (!isUuid(guesthouseId)) {
    return actionResult("VALIDATION_ERROR", INVALID_GUESTHOUSE_ID_MESSAGE);
  }

  const uploadedPhotoPaths = photoChanges?.uploadedPhotoPaths ?? [];

  try {
    const authUser = await getCurrentAuthUser();
    if (!authUser) {
      return actionResult("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const owner = await getProfileById(authUser.id);
    if (!owner || owner.role !== "owner") {
      return actionResult(
        "UNAUTHORIZED",
        "사장님 계정만 실행할 수 있는 작업입니다.",
      );
    }

    const supabase = createSupabaseAdminClient();
    let values: EditableGuesthouseUpdate;
    try {
      values = normalizePayload(payload);
    } catch (error) {
      await cleanupUploadedPhotoPaths(uploadedPhotoPaths);
      return actionResult(
        "VALIDATION_ERROR",
        error instanceof Error ? error.message : "입력값을 확인해 주세요.",
      );
    }

    if (photoChanges) {
      const validationMessage = getPhotoPayloadValidationMessage(
        photoChanges,
        owner.id,
      );
      if (validationMessage) {
        await cleanupUploadedPhotoPaths(uploadedPhotoPaths);
        return actionResult("VALIDATION_ERROR", validationMessage);
      }
    }

    const { data: currentData, error: loadError } = await supabase
      .from("guesthouses")
      .select("*")
      .eq("id", guesthouseId)
      .maybeSingle();

    if (loadError) {
      await cleanupUploadedPhotoPaths(uploadedPhotoPaths);
      console.error("[owner-guesthouse-edit] load failed", {
        user_id: owner.id,
        guesthouse_id: guesthouseId,
        error: serializeSupabaseError(loadError),
      });
      return actionResult(
        "UPDATE_FAILED",
        "변경사항을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
    if (!currentData) {
      await cleanupUploadedPhotoPaths(uploadedPhotoPaths);
      return actionResult("NOT_FOUND", "게스트하우스를 찾을 수 없습니다.");
    }

    const current = currentData as Guesthouse;
    if (current.owner_id !== owner.id) {
      await cleanupUploadedPhotoPaths(uploadedPhotoPaths);
      return actionResult(
        "UNAUTHORIZED",
        "현재 owner가 수정할 수 있는 게스트하우스가 아닙니다.",
      );
    }

    const { data: currentPhotoData, error: currentPhotoError } = await supabase
      .from("guesthouse_photos")
      .select("*")
      .eq("guesthouse_id", guesthouseId)
      .eq("owner_id", owner.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (currentPhotoError) {
      await cleanupUploadedPhotoPaths(uploadedPhotoPaths);
      console.error("[owner-guesthouse-edit] photo load failed", {
        user_id: owner.id,
        guesthouse_id: guesthouseId,
        error: serializeSupabaseError(currentPhotoError),
      });
      return actionResult(
        "UPDATE_FAILED",
        "변경사항을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    }

    const currentPhotos = (currentPhotoData ?? []) as GuesthousePhoto[];
    const textHasChanges = hasTextChanges(current, values);
    const photoHasChanges = getPhotoHasChanges(currentPhotos, photoChanges);

    if (!textHasChanges && !photoHasChanges) {
      return actionResult("NO_CHANGES", "변경된 내용이 없습니다.");
    }

    logAction("updateGuesthouse:update:start", guesthouseId, {
      user_id: owner.id,
      text_has_changes: textHasChanges,
      photo_has_changes: photoHasChanges,
    });

    if (textHasChanges) {
      const { data, error } = await supabase
        .from("guesthouses")
        .update(values)
        .eq("id", guesthouseId)
        .eq("owner_id", owner.id)
        .select("id")
        .maybeSingle();

      if (error) {
        await cleanupUploadedPhotoPaths(uploadedPhotoPaths);
        console.error("[owner-guesthouse-edit] update failed", {
          user_id: owner.id,
          guesthouse_id: guesthouseId,
          error: serializeSupabaseError(error),
        });
        return actionResult(
          "UPDATE_FAILED",
          "변경사항을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }
      if (!data) {
        await cleanupUploadedPhotoPaths(uploadedPhotoPaths);
        return actionResult("NOT_FOUND", "게스트하우스 수정 결과가 없습니다.");
      }
    }

    let deletedPhotoPaths: string[] = [];
    const insertedPhotoPaths: string[] = [];

    if (photoHasChanges && photoChanges) {
      const currentPhotoById = new Map(
        currentPhotos.map((photo) => [photo.id, photo]),
      );
      const orderedExistingIds = getOrderedExistingIds(photoChanges);
      const orderedNewPaths = getOrderedNewPaths(photoChanges);
      const deletedPhotoIds = photoChanges.deletedPhotoIds;

      const missingExistingId = orderedExistingIds.find(
        (photoId) => !currentPhotoById.has(photoId),
      );
      const missingDeletedId = deletedPhotoIds.find(
        (photoId) => !currentPhotoById.has(photoId),
      );
      if (missingExistingId || missingDeletedId) {
        await cleanupUploadedPhotoPaths(uploadedPhotoPaths);
        return actionResult("VALIDATION_ERROR", "사진 순서 정보가 올바르지 않습니다.");
      }

      const deletedPhotoIdSet = new Set(deletedPhotoIds);
      const expectedExistingIds = currentPhotos
        .filter((photo) => !deletedPhotoIdSet.has(photo.id))
        .map((photo) => photo.id);
      if (
        expectedExistingIds.length !== orderedExistingIds.length ||
        expectedExistingIds.some(
          (photoId) => !orderedExistingIds.includes(photoId),
        )
      ) {
        await cleanupUploadedPhotoPaths(uploadedPhotoPaths);
        return actionResult("VALIDATION_ERROR", "사진 순서 정보가 올바르지 않습니다.");
      }

      deletedPhotoPaths = deletedPhotoIds.flatMap((photoId) => {
        const photo = currentPhotoById.get(photoId);
        return photo ? [photo.photo_path] : [];
      });

      const newPhotoRows = photoChanges.orderedPhotos.flatMap(
        (photo, sortOrder) =>
          photo.type === "new"
            ? [
                {
                  guesthouse_id: guesthouseId,
                  owner_id: owner.id,
                  photo_path: photo.path,
                  alt_text: values.name,
                  sort_order: sortOrder,
                },
              ]
            : [],
      );

      if (newPhotoRows.length > 0) {
        const { error: insertError } = await supabase
          .from("guesthouse_photos")
          .insert(newPhotoRows);

        if (insertError) {
          await cleanupUploadedPhotoPaths(uploadedPhotoPaths);
          console.error("[owner-guesthouse-edit] photo metadata insert failed", {
            user_id: owner.id,
            guesthouse_id: guesthouseId,
            error: serializeSupabaseError(insertError),
          });
          return actionResult(
            "UPDATE_FAILED",
            "변경사항을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
          );
        }
        insertedPhotoPaths.push(
          ...newPhotoRows.map((photo) => photo.photo_path),
        );
      }

      const existingUpdates = photoChanges.orderedPhotos.flatMap(
        (photo, sortOrder) =>
          photo.type === "existing"
            ? [
                supabase
                  .from("guesthouse_photos")
                  .update({ sort_order: sortOrder, alt_text: values.name })
                  .eq("id", photo.id)
                  .eq("guesthouse_id", guesthouseId)
                  .eq("owner_id", owner.id),
              ]
            : [],
      );

      const updateResults = await Promise.all(existingUpdates);
      const updateError = updateResults.find((result) => result.error)?.error;
      if (updateError) {
        await rollbackInsertedPhotoRows(
          guesthouseId,
          owner.id,
          insertedPhotoPaths,
        );
        await cleanupUploadedPhotoPaths(uploadedPhotoPaths);
        console.error("[owner-guesthouse-edit] photo metadata reorder failed", {
          user_id: owner.id,
          guesthouse_id: guesthouseId,
          error: serializeSupabaseError(updateError),
        });
        return actionResult(
          "UPDATE_FAILED",
          "변경사항을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }

      if (deletedPhotoIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("guesthouse_photos")
          .delete()
          .eq("guesthouse_id", guesthouseId)
          .eq("owner_id", owner.id)
          .in("id", deletedPhotoIds);

        if (deleteError) {
          await rollbackInsertedPhotoRows(
            guesthouseId,
            owner.id,
            insertedPhotoPaths,
          );
          await cleanupUploadedPhotoPaths(uploadedPhotoPaths);
          console.error("[owner-guesthouse-edit] photo metadata delete failed", {
            user_id: owner.id,
            guesthouse_id: guesthouseId,
            error: serializeSupabaseError(deleteError),
          });
          return actionResult(
            "UPDATE_FAILED",
            "변경사항을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
          );
        }
      }
    }

    revalidatePath("/owner");
    revalidatePath("/owner/guesthouse");
    revalidatePath("/owner/guesthouse/edit");

    await removeDeletedPhotoPaths(deletedPhotoPaths, owner.id, guesthouseId);
    logAction("updateGuesthouse:done", guesthouseId, {
      user_id: owner.id,
      success: true,
    });
    return actionResult("SUCCESS", "변경사항이 저장되었습니다.");
  } catch (error) {
    await cleanupUploadedPhotoPaths(uploadedPhotoPaths);
    console.error("[owner-guesthouse-edit] action failed", {
      guesthouse_id: guesthouseId,
      error: serializeSupabaseError(error),
    });
    return actionResult(
      "UPDATE_FAILED",
      "변경사항을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }
}

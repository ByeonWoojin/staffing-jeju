"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { JobPostPhoto } from "@/types/database";
import {
  deleteJobPostPhoto,
  uploadJobPostPhoto,
} from "@/app/owner/jobs/[id]/edit/actions";
import {
  getActionResultMessage,
  getSafeErrorMessage,
} from "@/lib/action-result";
import {
  DEFAULT_GUESTHOUSE_IMAGE,
  DEFAULT_GUESTHOUSE_IMAGE_ALT,
} from "@/lib/guesthouse-image";
import { AlertDialog, Button, FieldInfoTooltip } from "@/components/ui";

interface JobPostPhotoWithUrl extends JobPostPhoto {
  publicUrl: string;
}

interface JobPostPhotoManagerProps {
  jobPostId: string;
  photos: JobPostPhotoWithUrl[];
}

const MAX_PHOTO_COUNT = 5;
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_UPLOAD_FAILED_MESSAGE =
  "사진 업로드 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
const PHOTO_DELETE_FAILED_MESSAGE =
  "사진 삭제 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

export function JobPostPhotoManager({
  jobPostId,
  photos,
}: JobPostPhotoManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const canUpload = photos.length < MAX_PHOTO_COUNT;

  const showErrorMessage = (message: string) => {
    setErrorMessage(message);
    setAlertMessage(message);
  };

  const handleUpload = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      showErrorMessage("업로드할 사진을 선택해주세요.");
      return;
    }
    if (!canUpload) {
      showErrorMessage("사진은 최대 5장까지 등록할 수 있습니다.");
      return;
    }
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      showErrorMessage(
        "JPG, JPEG, PNG, WEBP 형식의 사진만 등록할 수 있습니다.",
      );
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      showErrorMessage("사진 한 장의 용량은 최대 5MB까지 가능합니다.");
      return;
    }

    const formData = new FormData();
    formData.append("jobPostId", jobPostId);
    formData.append("photo", file);

    setIsUploading(true);
    try {
      const result = await uploadJobPostPhoto(formData);
      if (!result.success) {
        showErrorMessage(
          result.code === "UPDATE_FAILED"
            ? PHOTO_UPLOAD_FAILED_MESSAGE
            : getActionResultMessage(result, PHOTO_UPLOAD_FAILED_MESSAGE),
        );
        return;
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccessMessage(result.message);
      router.refresh();
    } catch (error) {
      console.error("[JobPostPhotoManager] upload failed", error);
      showErrorMessage(getSafeErrorMessage(error, PHOTO_UPLOAD_FAILED_MESSAGE));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm("사진을 삭제하시겠습니까?")) return;

    setDeletingPhotoId(photoId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await deleteJobPostPhoto(photoId);
      if (!result.success) {
        showErrorMessage(
          result.code === "UPDATE_FAILED"
            ? PHOTO_DELETE_FAILED_MESSAGE
            : getActionResultMessage(result, PHOTO_DELETE_FAILED_MESSAGE),
        );
        return;
      }

      setSuccessMessage(result.message);
      router.refresh();
    } catch (error) {
      console.error("[JobPostPhotoManager] delete failed", error);
      showErrorMessage(getSafeErrorMessage(error, PHOTO_DELETE_FAILED_MESSAGE));
    } finally {
      setDeletingPhotoId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-1.5">
          <h3 className="text-body-sm font-semibold text-neutral-800">
            모집글 사진
          </h3>
          <FieldInfoTooltip
            label="모집글 사진"
            helpText="첫 번째 이미지는 모집글의 대표 이미지로 사용되며, 모집글 목록과 상세 화면에서 게스트하우스를 소개하는 이미지로 표시됩니다."
          />
        </div>
        <p className="mt-1 text-caption text-neutral-500">
          근무 공간, 공용 공간, 스탭 숙소 등 지원자에게 보여주고 싶은
          사진을 등록해주세요.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={!canUpload || isUploading}
          className="block w-full rounded-md border border-neutral-200 bg-neutral-0 px-4 py-2 text-body-sm text-neutral-700 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-body-sm file:font-semibold file:text-primary-700"
        />
        <Button
          type="button"
          variant="soft-primary"
          onClick={handleUpload}
          disabled={!canUpload || isUploading}
          className="shrink-0"
        >
          {isUploading ? "업로드 중..." : "사진 업로드"}
        </Button>
      </div>
      <p className="text-caption text-neutral-500">
        JPG, PNG, WEBP 형식만 가능하며 1장당 최대 5MB입니다.
      </p>
      {errorMessage && (
        <p
          role="alert"
          className="rounded-md border border-danger/20 bg-danger-light px-3 py-2 text-[13px] font-medium text-danger-muted"
        >
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p
          role="status"
          className="rounded-md border border-primary-100 bg-primary-50 px-3 py-2 text-[13px] font-semibold text-primary-700"
        >
          {successMessage}
        </p>
      )}

      {photos.length === 0 ? (
        <div className="overflow-hidden rounded-md border border-dashed border-neutral-200 bg-neutral-0">
          <div className="relative aspect-[16/9] max-h-[320px] bg-beige">
            <Image
              src={DEFAULT_GUESTHOUSE_IMAGE}
              alt={DEFAULT_GUESTHOUSE_IMAGE_ALT}
              fill
              sizes="(min-width: 1024px) 720px, 100vw"
              className="object-cover"
            />
          </div>
          <p className="px-4 py-3 text-center text-body-sm text-neutral-500">
            등록된 사진이 없어요. 모집글 사진을 추가해 주세요.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0"
            >
              <div className="relative aspect-[4/3] bg-neutral-100">
                <Image
                  src={photo.publicUrl}
                  alt={photo.alt_text ?? `모집글 사진 ${index + 1}`}
                  fill
                  sizes="(min-width: 1024px) 240px, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="flex items-center justify-between gap-3 p-3">
                <p className="text-caption text-neutral-500">사진 {index + 1}</p>
                <Button
                  type="button"
                  variant="outline-danger"
                  size="sm"
                  disabled={deletingPhotoId !== null}
                  onClick={() => handleDelete(photo.id)}
                >
                  {deletingPhotoId === photo.id ? "삭제 중..." : "삭제"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <AlertDialog
        open={alertMessage !== null}
        message={alertMessage ?? ""}
        onClose={() => setAlertMessage(null)}
      />
    </div>
  );
}

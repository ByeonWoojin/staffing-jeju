"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GuesthousePhoto } from "@/types/database";
import {
  deleteGuesthousePhoto,
  reorderGuesthousePhotos,
  uploadGuesthousePhotos,
} from "@/app/owner/guesthouse/edit/actions";
import {
  DEFAULT_GUESTHOUSE_IMAGE,
  DEFAULT_GUESTHOUSE_IMAGE_ALT,
} from "@/lib/guesthouse-image";
import { Button } from "@/components/ui";

interface GuesthousePhotoWithUrl extends GuesthousePhoto {
  publicUrl: string;
}

interface GuesthousePhotoManagerProps {
  guesthouseId: string;
  photos: GuesthousePhotoWithUrl[];
}

const MAX_PHOTO_COUNT = 5;
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getFileSignature(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function formatFileSize(size: number) {
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function validateSelectedPhotoFiles(files: File[], availableSlots: number) {
  const errors: string[] = [];
  const acceptedFiles: File[] = [];
  const seenSignatures = new Set<string>();

  if (availableSlots <= 0) {
    return {
      acceptedFiles,
      errors: ["사진은 최대 5장까지 등록할 수 있어요."],
    };
  }

  for (const file of files) {
    const signature = getFileSignature(file);
    if (seenSignatures.has(signature)) {
      errors.push(`${file.name}: 같은 파일이 중복 선택됐어요.`);
      continue;
    }
    seenSignatures.add(signature);

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      errors.push(
        `${file.name}: JPG, PNG, WEBP 형식의 이미지만 등록할 수 있어요.`,
      );
      continue;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      errors.push(`${file.name}: 사진 한 장의 용량은 5MB 이하여야 해요.`);
      continue;
    }
    if (acceptedFiles.length >= availableSlots) {
      errors.push("사진은 최대 5장까지 등록할 수 있어요.");
      continue;
    }

    acceptedFiles.push(file);
  }

  return { acceptedFiles, errors };
}

interface GuesthousePhotoPickerProps {
  disabled?: boolean;
  onFilesChange: (files: File[]) => void;
}

export function GuesthousePhotoPicker({
  disabled = false,
  onFilesChange,
}: GuesthousePhotoPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const inputId = useId();
  const errorId = useId();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPreviewUrls, setSelectedPreviewUrls] = useState<string[]>([]);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const replaceSelectedFiles = (files: File[]) => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const previewUrls = files.map((file) => URL.createObjectURL(file));
    previewUrlsRef.current = previewUrls;
    setSelectedFiles(files);
    setSelectedPreviewUrls(previewUrls);
    onFilesChange(files);
  };

  const clearSelectedFiles = () => {
    replaceSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      clearSelectedFiles();
      setErrorMessages([]);
      return;
    }

    const { acceptedFiles, errors } = validateSelectedPhotoFiles(
      files,
      MAX_PHOTO_COUNT,
    );
    replaceSelectedFiles(acceptedFiles);
    setErrorMessages(errors);
  };

  const removeSelectedFile = (fileIndex: number) => {
    const nextFiles = selectedFiles.filter((_, index) => index !== fileIndex);
    replaceSelectedFiles(nextFiles);
    if (nextFiles.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const moveSelectedFile = (fileIndex: number, direction: -1 | 1) => {
    const nextIndex = fileIndex + direction;
    if (nextIndex < 0 || nextIndex >= selectedFiles.length) return;

    const nextFiles = [...selectedFiles];
    [nextFiles[fileIndex], nextFiles[nextIndex]] = [
      nextFiles[nextIndex],
      nextFiles[fileIndex],
    ];
    replaceSelectedFiles(nextFiles);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-body-sm font-semibold text-neutral-800">
          게스트하우스 사진
        </h3>
        <p className="mt-1 text-caption text-neutral-500">
          게스트하우스 사진을 최대 5장까지 등록할 수 있어요. 첫 번째 사진이
          대표 이미지로 사용됩니다.
        </p>
        <p className="mt-1 text-caption text-neutral-500">
          JPG, PNG, WEBP 형식 · 파일당 최대 5MB
        </p>
      </div>

      <div className="grid gap-3">
        <label
          htmlFor={inputId}
          className="text-body-sm font-semibold text-neutral-800"
        >
          사진 선택
        </label>
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          aria-describedby={errorMessages.length > 0 ? errorId : undefined}
          onChange={handleFileChange}
          className="block w-full rounded-md border border-neutral-200 bg-neutral-0 px-4 py-2 text-body-sm text-neutral-700 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-body-sm file:font-semibold file:text-primary-700"
        />
        <p className="text-caption text-neutral-500">
          선택한 사진 {selectedFiles.length}장 · 최대 {MAX_PHOTO_COUNT}장
        </p>
        {errorMessages.length > 0 && (
          <div
            id={errorId}
            className="rounded-md border border-danger/20 bg-danger-light px-3 py-2 text-[13px] font-medium text-danger-muted"
          >
            {errorMessages.map((message, index) => (
              <p key={`${message}-${index}`}>{message}</p>
            ))}
          </div>
        )}
      </div>

      {selectedFiles.length > 0 && (
        <div className="grid gap-3 rounded-md border border-neutral-100 bg-neutral-50 p-3">
          <p className="text-caption font-semibold text-neutral-600">
            저장할 사진
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {selectedFiles.map((file, index) => (
              <div
                key={getFileSignature(file)}
                className="overflow-hidden rounded-md border border-dashed border-primary-100 bg-neutral-0"
              >
                <div className="relative aspect-[4/3] bg-neutral-100">
                  {selectedPreviewUrls[index] ? (
                    <Image
                      src={selectedPreviewUrls[index]}
                      alt={`저장할 게스트하우스 사진 ${index + 1}`}
                      fill
                      sizes="(min-width: 1024px) 160px, (min-width: 640px) 33vw, 50vw"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-caption text-neutral-400">
                      미리보기 준비 중
                    </div>
                  )}
                  {index === 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-primary-500 px-2 py-0.5 text-[11px] font-bold text-white">
                      대표
                    </span>
                  )}
                </div>
                <div className="grid gap-2 p-2">
                  <p className="truncate text-[12px] font-medium text-neutral-600">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {formatFileSize(file.size)}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={index === 0 || disabled}
                      className="min-h-9 px-2 text-caption"
                      aria-label={`${file.name} 앞으로 이동`}
                      onClick={() => moveSelectedFile(index, -1)}
                    >
                      앞으로
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={index === selectedFiles.length - 1 || disabled}
                      className="min-h-9 px-2 text-caption"
                      aria-label={`${file.name} 뒤로 이동`}
                      onClick={() => moveSelectedFile(index, 1)}
                    >
                      뒤로
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className="min-h-9 px-2 text-caption font-semibold text-danger-muted hover:bg-danger-light/50"
                    aria-label={`${file.name} 선택 취소`}
                    onClick={() => removeSelectedFile(index)}
                  >
                    선택 취소
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedFiles.length === 0 && (
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
            등록된 사진이 없어요. 게스트하우스 사진을 추가해 주세요.
          </p>
        </div>
      )}
    </div>
  );
}

export function GuesthousePhotoManager({
  guesthouseId,
  photos,
}: GuesthousePhotoManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const errorId = useId();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPreviewUrls, setSelectedPreviewUrls] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [movingPhotoId, setMovingPhotoId] = useState<string | null>(null);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const canUploadMore = photos.length < MAX_PHOTO_COUNT;
  const remainingSlots = Math.max(0, MAX_PHOTO_COUNT - photos.length);
  const activePhoto =
    photos.length > 0
      ? photos[Math.min(activePhotoIndex, photos.length - 1)]
      : null;

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const replaceSelectedFiles = (files: File[]) => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const previewUrls = files.map((file) => URL.createObjectURL(file));
    previewUrlsRef.current = previewUrls;
    setSelectedFiles(files);
    setSelectedPreviewUrls(previewUrls);
  };

  const clearSelectedFiles = () => {
    replaceSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const nextErrors: string[] = [];

    if (files.length === 0) {
      clearSelectedFiles();
      setErrorMessages([]);
      setSuccessMessage(null);
      return;
    }

    if (!canUploadMore) {
      replaceSelectedFiles([]);
      setErrorMessages(["사진은 최대 5장까지 등록할 수 있어요."]);
      setSuccessMessage(null);
      return;
    }

    const { acceptedFiles, errors } = validateSelectedPhotoFiles(
      files,
      remainingSlots,
    );
    nextErrors.push(...errors);
    replaceSelectedFiles(acceptedFiles);
    setErrorMessages(nextErrors);
    setSuccessMessage(
      acceptedFiles.length > 0
        ? `${acceptedFiles.length}장의 사진을 업로드할 수 있어요.`
        : null,
    );
  };

  const removeSelectedFile = (fileIndex: number) => {
    const nextFiles = selectedFiles.filter((_, index) => index !== fileIndex);
    replaceSelectedFiles(nextFiles);
    setSuccessMessage(null);
    if (nextFiles.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const moveSelectedFile = (fileIndex: number, direction: -1 | 1) => {
    const nextIndex = fileIndex + direction;
    if (nextIndex < 0 || nextIndex >= selectedFiles.length) return;

    const nextFiles = [...selectedFiles];
    [nextFiles[fileIndex], nextFiles[nextIndex]] = [
      nextFiles[nextIndex],
      nextFiles[fileIndex],
    ];
    replaceSelectedFiles(nextFiles);
    setSuccessMessage(
      nextFiles.length > 0
        ? `${nextFiles.length}장의 사진을 업로드할 수 있어요.`
        : null,
    );
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setErrorMessages(["업로드할 사진을 선택해주세요."]);
      setSuccessMessage(null);
      return;
    }

    const formData = new FormData();
    formData.append("guesthouseId", guesthouseId);
    selectedFiles.forEach((file) => {
      formData.append("photos", file);
    });

    setIsUploading(true);
    setErrorMessages([]);
    setSuccessMessage(null);
    try {
      await uploadGuesthousePhotos(formData);
      const uploadedCount = selectedFiles.length;
      clearSelectedFiles();
      setSuccessMessage(`${uploadedCount}장의 사진을 업로드했어요.`);
      router.refresh();
    } catch (error) {
      console.error("[GuesthousePhotoManager] upload failed", error);
      setErrorMessages([
        error instanceof Error
          ? error.message
          : "사진 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.",
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm("사진을 삭제하시겠습니까?")) return;

    setDeletingPhotoId(photoId);
    setErrorMessages([]);
    setSuccessMessage(null);
    try {
      await deleteGuesthousePhoto(photoId);
      setActivePhotoIndex(0);
      router.refresh();
    } catch (error) {
      console.error("[GuesthousePhotoManager] delete failed", error);
      setErrorMessages([
        error instanceof Error
          ? error.message
          : "사진 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.",
      ]);
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= photos.length) return;

    const orderedIds = photos.map((photo) => photo.id);
    [orderedIds[index], orderedIds[nextIndex]] = [
      orderedIds[nextIndex],
      orderedIds[index],
    ];

    setMovingPhotoId(photos[index].id);
    setErrorMessages([]);
    setSuccessMessage(null);
    try {
      await reorderGuesthousePhotos(guesthouseId, orderedIds);
      setActivePhotoIndex(nextIndex);
      router.refresh();
    } catch (error) {
      console.error("[GuesthousePhotoManager] reorder failed", error);
      setErrorMessages([
        error instanceof Error ? error.message : "사진 순서 변경에 실패했습니다.",
      ]);
    } finally {
      setMovingPhotoId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-body-sm font-semibold text-neutral-800">
          게스트하우스 사진
        </h3>
        <p className="mt-1 text-caption text-neutral-500">
          게스트하우스 사진을 최대 5장까지 등록할 수 있어요. 첫 번째 사진이
          대표 이미지로 사용됩니다.
        </p>
        <p className="mt-1 text-caption text-neutral-500">
          JPG, PNG, WEBP 형식 · 파일당 최대 5MB
        </p>
      </div>

      <div className="grid gap-3">
        <label
          htmlFor="guesthouse-photo-files"
          className="text-body-sm font-semibold text-neutral-800"
        >
          사진 선택
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={fileInputRef}
            id="guesthouse-photo-files"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={!canUploadMore || isUploading}
            aria-describedby={errorMessages.length > 0 ? errorId : undefined}
            onChange={handleFileChange}
            className="block w-full rounded-md border border-neutral-200 bg-neutral-0 px-4 py-2 text-body-sm text-neutral-700 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-body-sm file:font-semibold file:text-primary-700"
          />
          <Button
            type="button"
            variant="soft-primary"
            onClick={handleUpload}
            disabled={!canUploadMore || selectedFiles.length === 0 || isUploading}
            className="min-h-11 shrink-0"
          >
            {isUploading ? "업로드 중..." : "선택한 사진 업로드"}
          </Button>
        </div>
        <p className="text-caption text-neutral-500">
          현재 {photos.length}장 등록됨 · 추가 가능 {remainingSlots}장
        </p>
        {errorMessages.length > 0 && (
          <div
            id={errorId}
            className="rounded-md border border-danger/20 bg-danger-light px-3 py-2 text-[13px] font-medium text-danger-muted"
          >
            {errorMessages.map((message, index) => (
              <p key={`${message}-${index}`}>{message}</p>
            ))}
          </div>
        )}
        {successMessage && (
          <p className="rounded-md border border-primary-100 bg-primary-50 px-3 py-2 text-[13px] font-semibold text-primary-700">
            {successMessage}
          </p>
        )}
      </div>

      {selectedFiles.length > 0 && (
        <div className="grid gap-3 rounded-md border border-neutral-100 bg-neutral-50 p-3">
          <p className="text-caption font-semibold text-neutral-600">
            업로드 대기 사진
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {selectedFiles.map((file, index) => (
              <div
                key={getFileSignature(file)}
                className="overflow-hidden rounded-md border border-dashed border-primary-100 bg-neutral-0"
              >
                <div className="relative aspect-[4/3] bg-neutral-100">
                  {selectedPreviewUrls[index] ? (
                    <Image
                      src={selectedPreviewUrls[index]}
                      alt={`업로드 대기 사진 ${index + 1}`}
                      fill
                      sizes="(min-width: 1024px) 160px, (min-width: 640px) 33vw, 50vw"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-caption text-neutral-400">
                      미리보기 준비 중
                    </div>
                  )}
                  {photos.length === 0 && index === 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-primary-500 px-2 py-0.5 text-[11px] font-bold text-white">
                      대표
                    </span>
                  )}
                </div>
                <div className="grid gap-2 p-2">
                  <p className="truncate text-[12px] font-medium text-neutral-600">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {formatFileSize(file.size)}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={index === 0 || isUploading}
                      className="min-h-9 px-2 text-caption"
                      aria-label={`${file.name} 앞으로 이동`}
                      onClick={() => moveSelectedFile(index, -1)}
                    >
                      앞으로
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={index === selectedFiles.length - 1 || isUploading}
                      className="min-h-9 px-2 text-caption"
                      aria-label={`${file.name} 뒤로 이동`}
                      onClick={() => moveSelectedFile(index, 1)}
                    >
                      뒤로
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isUploading}
                    className="min-h-9 px-2 text-caption font-semibold text-danger-muted hover:bg-danger-light/50"
                    aria-label={`${file.name} 선택 취소`}
                    onClick={() => removeSelectedFile(index)}
                  >
                    선택 취소
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
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
            등록된 사진이 없어요. 게스트하우스 사진을 추가해 주세요.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-neutral-100 bg-neutral-0">
          {activePhoto && (
            <div className="relative aspect-[16/9] max-h-[360px] bg-beige">
              <Image
                src={activePhoto.publicUrl}
                alt={activePhoto.alt_text ?? "게스트하우스 대표 사진"}
                fill
                sizes="(min-width: 1024px) 720px, 100vw"
                className="object-cover"
              />
              {Math.min(activePhotoIndex, photos.length - 1) === 0 && (
                <span className="absolute left-3 top-3 rounded-full bg-primary-500 px-2.5 py-1 text-[12px] font-bold text-white">
                  대표
                </span>
              )}
            </div>
          )}
          <div className="grid gap-3 border-t border-neutral-100 bg-neutral-50 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className={`overflow-hidden rounded-md border bg-neutral-0 transition-colors ${
                  Math.min(activePhotoIndex, photos.length - 1) === index
                    ? "border-primary-300"
                    : "border-neutral-100 hover:border-neutral-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActivePhotoIndex(index)}
                  className="relative block aspect-[4/3] w-full bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                  aria-label={`게스트하우스 사진 ${index + 1} 크게 보기`}
                >
                  <Image
                    src={photo.publicUrl}
                    alt={photo.alt_text ?? `게스트하우스 사진 ${index + 1}`}
                    fill
                    sizes="(min-width: 1024px) 220px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                  {index === 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-primary-500 px-2 py-0.5 text-[11px] font-bold text-white">
                      대표
                    </span>
                  )}
                </button>
                <div className="grid gap-2 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-caption font-semibold text-neutral-500">
                      사진 {index + 1}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={deletingPhotoId !== null || movingPhotoId !== null}
                      className="min-h-9 px-2 text-caption font-semibold text-danger-muted hover:bg-danger-light/50"
                      aria-label={`게스트하우스 사진 ${index + 1} 삭제`}
                      onClick={() => void handleDelete(photo.id)}
                    >
                      {deletingPhotoId === photo.id ? "삭제 중..." : "삭제"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        index === 0 ||
                        deletingPhotoId !== null ||
                        movingPhotoId !== null
                      }
                      className="min-h-9 px-2 text-caption"
                      aria-label={`게스트하우스 사진 ${index + 1} 앞으로 이동`}
                      onClick={() => void handleMove(index, -1)}
                    >
                      앞으로
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        index === photos.length - 1 ||
                        deletingPhotoId !== null ||
                        movingPhotoId !== null
                      }
                      className="min-h-9 px-2 text-caption"
                      aria-label={`게스트하우스 사진 ${index + 1} 뒤로 이동`}
                      onClick={() => void handleMove(index, 1)}
                    >
                      뒤로
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

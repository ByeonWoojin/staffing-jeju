"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { GuesthousePhoto } from "@/types/database";
import {
  GUESTHOUSE_PHOTO_MAX_COUNT,
  getGuesthousePhotoFileSignature,
  validateGuesthousePhotoFile,
} from "@/lib/guesthouse-photo-upload";
import {
  DEFAULT_GUESTHOUSE_IMAGE,
  DEFAULT_GUESTHOUSE_IMAGE_ALT,
} from "@/lib/guesthouse-image";
import { AlertDialog, Button } from "@/components/ui";

export interface GuesthousePhotoWithUrl extends GuesthousePhoto {
  publicUrl: string;
}

export type ExistingGuesthouseImage = {
  type: "existing";
  id: string;
  path: string;
  previewUrl: string;
  altText: string | null;
};

export type NewGuesthouseImage = {
  type: "new";
  clientId: string;
  file: File;
  previewUrl: string;
  signature: string;
};

export type EditableGuesthouseImage =
  | ExistingGuesthouseImage
  | NewGuesthouseImage;

export type GuesthousePhotoDraft = {
  images: EditableGuesthouseImage[];
  deletedExistingPhotoIds: string[];
  hasChanges: boolean;
};

interface GuesthousePhotoManagerProps {
  photos?: GuesthousePhotoWithUrl[];
  disabled?: boolean;
  onDraftChange: (draft: GuesthousePhotoDraft) => void;
}

function formatFileSize(size: number) {
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function createInitialImages(photos: GuesthousePhotoWithUrl[]) {
  return photos.map<ExistingGuesthouseImage>((photo) => ({
    type: "existing",
    id: photo.id,
    path: photo.photo_path,
    previewUrl: photo.publicUrl,
    altText: photo.alt_text,
  }));
}

function getImageKey(image: EditableGuesthouseImage) {
  return image.type === "existing" ? image.id : image.clientId;
}

function getInitialExistingOrder(images: EditableGuesthouseImage[]) {
  return images.flatMap((image) => (image.type === "existing" ? [image.id] : []));
}

function getHasChanges(
  images: EditableGuesthouseImage[],
  initialExistingOrder: string[],
  deletedExistingPhotoIds: string[],
) {
  if (deletedExistingPhotoIds.length > 0) return true;
  if (images.some((image) => image.type === "new")) return true;

  const currentExistingOrder = getInitialExistingOrder(images);
  if (currentExistingOrder.length !== initialExistingOrder.length) return true;

  return currentExistingOrder.some(
    (photoId, index) => photoId !== initialExistingOrder[index],
  );
}

function createDraft(
  images: EditableGuesthouseImage[],
  initialExistingOrder: string[],
  deletedExistingPhotoIds: string[],
): GuesthousePhotoDraft {
  return {
    images,
    deletedExistingPhotoIds,
    hasChanges: getHasChanges(
      images,
      initialExistingOrder,
      deletedExistingPhotoIds,
    ),
  };
}

function getMaxCountMessage(availableSlots: number) {
  return `사진은 최대 5장까지 등록할 수 있습니다. 현재 추가할 수 있는 사진은 ${availableSlots}장입니다.`;
}

export function GuesthousePhotoManager({
  photos = [],
  disabled = false,
  onDraftChange,
}: GuesthousePhotoManagerProps) {
  const [initialExistingOrder] = useState(() =>
    getInitialExistingOrder(createInitialImages(photos)),
  );
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const errorId = useId();
  const [images, setImages] = useState<EditableGuesthouseImage[]>(
    () => createInitialImages(photos),
  );
  const [deletedExistingPhotoIds, setDeletedExistingPhotoIds] = useState<
    string[]
  >([]);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  useEffect(() => {
    onDraftChange(
      createDraft(
        images,
        initialExistingOrder,
        deletedExistingPhotoIds,
      ),
    );
  }, [deletedExistingPhotoIds, images, initialExistingOrder, onDraftChange]);

  const revokeIfNewImage = (image: EditableGuesthouseImage) => {
    if (image.type !== "new") return;
    URL.revokeObjectURL(image.previewUrl);
    objectUrlsRef.current.delete(image.previewUrl);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (selectedFiles.length === 0) return;

    const availableSlots = Math.max(
      0,
      GUESTHOUSE_PHOTO_MAX_COUNT - images.length,
    );
    const nextErrors: string[] = [];
    const acceptedImages: NewGuesthouseImage[] = [];
    const existingSignatures = new Set(
      images.flatMap((image) =>
        image.type === "new" ? [image.signature] : [],
      ),
    );

    if (availableSlots <= 0) {
      const message = getMaxCountMessage(0);
      setErrorMessages([message]);
      setAlertMessage(message);
      return;
    }

    for (const file of selectedFiles) {
      const signature = getGuesthousePhotoFileSignature(file);
      if (existingSignatures.has(signature)) {
        nextErrors.push("같은 사진은 중복으로 추가하지 않았습니다.");
        continue;
      }

      const validationMessage = validateGuesthousePhotoFile(file);
      if (validationMessage) {
        nextErrors.push(validationMessage);
        continue;
      }

      if (acceptedImages.length >= availableSlots) {
        nextErrors.push(getMaxCountMessage(availableSlots));
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.add(previewUrl);
      existingSignatures.add(signature);
      acceptedImages.push({
        type: "new",
        clientId: crypto.randomUUID(),
        file,
        previewUrl,
        signature,
      });
    }

    const uniqueErrors = Array.from(new Set(nextErrors));
    setErrorMessages(uniqueErrors);
    if (uniqueErrors[0]) {
      setAlertMessage(uniqueErrors[0]);
    }
    if (acceptedImages.length > 0) {
      setImages([...images, ...acceptedImages]);
    }
  };

  const removeImage = (index: number) => {
    setErrorMessages([]);
    setImages((previousImages) => {
      const target = previousImages[index];
      if (!target) return previousImages;

      if (target.type === "existing") {
        setDeletedExistingPhotoIds((prev) =>
          prev.includes(target.id) ? prev : [...prev, target.id],
        );
      } else {
        revokeIfNewImage(target);
      }

      return previousImages.filter((_, imageIndex) => imageIndex !== index);
    });
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;

    setErrorMessages([]);
    setImages((previousImages) => {
      const nextImages = [...previousImages];
      [nextImages[index], nextImages[nextIndex]] = [
        nextImages[nextIndex],
        nextImages[index],
      ];
      return nextImages;
    });
  };

  const moveToFirst = (index: number) => {
    if (index <= 0 || index >= images.length) return;

    setErrorMessages([]);
    setImages((previousImages) => {
      const nextImages = [...previousImages];
      const [target] = nextImages.splice(index, 1);
      if (!target) return previousImages;
      nextImages.unshift(target);
      return nextImages;
    });
  };

  const remainingSlots = Math.max(0, GUESTHOUSE_PHOTO_MAX_COUNT - images.length);

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
          JPG, JPEG, PNG, WEBP 형식 · 파일당 최대 5MB
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
          disabled={disabled || remainingSlots === 0}
          aria-describedby={errorMessages.length > 0 ? errorId : undefined}
          onChange={handleFileChange}
          className="block w-full rounded-md border border-neutral-200 bg-neutral-0 px-4 py-2 text-body-sm text-neutral-700 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-body-sm file:font-semibold file:text-primary-700"
        />
        <p className="text-caption text-neutral-500">
          현재 {images.length}장 · 추가 가능 {remainingSlots}장
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

      {images.length === 0 ? (
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
        <div className="grid gap-3 rounded-md border border-neutral-100 bg-neutral-50 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <div
              key={getImageKey(image)}
              className="overflow-hidden rounded-md border border-neutral-100 bg-neutral-0"
            >
              <div className="relative aspect-[4/3] bg-neutral-100">
                <Image
                  src={image.previewUrl}
                  alt={
                    image.type === "existing"
                      ? (image.altText ?? `게스트하우스 사진 ${index + 1}`)
                      : `새 게스트하우스 사진 ${index + 1}`
                  }
                  fill
                  sizes="(min-width: 1024px) 220px, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                  unoptimized={image.type === "new"}
                />
                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-primary-500 px-2 py-0.5 text-[11px] font-bold text-white">
                    대표
                  </span>
                )}
                {image.type === "new" && (
                  <span className="absolute right-2 top-2 rounded-full bg-neutral-900/70 px-2 py-0.5 text-[11px] font-bold text-white">
                    신규
                  </span>
                )}
              </div>
              <div className="grid gap-2 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-caption font-semibold text-neutral-500">
                    {image.type === "new"
                      ? `${image.file.name} · ${formatFileSize(image.file.size)}`
                      : `사진 ${index + 1}`}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className="min-h-9 px-2 text-caption font-semibold text-danger-muted hover:bg-danger-light/50"
                    aria-label={`게스트하우스 사진 ${index + 1} 삭제`}
                    onClick={() => removeImage(index)}
                  >
                    삭제
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={index === 0 || disabled}
                    className="min-h-9 px-2 text-caption"
                    aria-label={`게스트하우스 사진 ${index + 1} 대표로 설정`}
                    onClick={() => moveToFirst(index)}
                  >
                    대표로
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={index === 0 || disabled}
                    className="min-h-9 px-2 text-caption"
                    aria-label={`게스트하우스 사진 ${index + 1} 앞으로 이동`}
                    onClick={() => moveImage(index, -1)}
                  >
                    앞으로
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={index === images.length - 1 || disabled}
                    className="min-h-9 px-2 text-caption"
                    aria-label={`게스트하우스 사진 ${index + 1} 뒤로 이동`}
                    onClick={() => moveImage(index, 1)}
                  >
                    뒤로
                  </Button>
                </div>
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

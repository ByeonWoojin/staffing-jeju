"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GuesthousePhoto } from "@/types/database";
import {
  deleteGuesthousePhoto,
  uploadGuesthousePhoto,
} from "@/app/owner/guesthouse/edit/actions";
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

export function GuesthousePhotoManager({
  guesthouseId,
  photos,
}: GuesthousePhotoManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const canUpload = photos.length < MAX_PHOTO_COUNT;

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      alert("업로드할 사진을 선택해주세요.");
      return;
    }
    if (!canUpload) {
      alert("게스트하우스 사진은 최대 5장까지 등록할 수 있습니다.");
      return;
    }
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      alert("JPG, PNG, WEBP 형식의 이미지만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      alert("사진은 1장당 최대 5MB까지만 업로드할 수 있습니다.");
      return;
    }

    const formData = new FormData();
    formData.append("guesthouseId", guesthouseId);
    formData.append("photo", file);

    setIsUploading(true);
    try {
      await uploadGuesthousePhoto(formData);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (error) {
      console.error("[GuesthousePhotoManager] upload failed", error);
      alert("사진 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm("사진을 삭제하시겠습니까?")) return;

    setDeletingPhotoId(photoId);
    try {
      await deleteGuesthousePhoto(photoId);
      router.refresh();
    } catch (error) {
      console.error("[GuesthousePhotoManager] delete failed", error);
      alert("사진 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setDeletingPhotoId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-body-sm font-semibold text-neutral-800">
          게스트하우스 사진
        </h3>
        <p className="mt-1 text-caption text-neutral-500">
          공개 공고에서 스탭이 보게 될 게스트하우스 분위기를 확인하세요.
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

      {photos.length === 0 ? (
        <div className="flex aspect-[16/9] items-center justify-center rounded-md border border-dashed border-neutral-200 bg-beige px-4 text-center">
          <p className="text-body-sm text-neutral-500">
            업로드된 사진이 없습니다.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-neutral-100 bg-neutral-0">
          <div className="relative aspect-[16/9] bg-beige">
            <Image
              src={photos[0].publicUrl}
              alt={photos[0].alt_text ?? "게스트하우스 대표 사진"}
              fill
              sizes="(min-width: 1024px) 720px, 100vw"
              className="object-cover"
            />
          </div>
          <div className="grid gap-3 border-t border-neutral-100 bg-neutral-50 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="overflow-hidden rounded-md border border-neutral-100 bg-neutral-0"
              >
                <div className="relative aspect-[4/3] bg-neutral-100">
                  <Image
                    src={photo.publicUrl}
                    alt={photo.alt_text ?? `게스트하우스 사진 ${index + 1}`}
                    fill
                    sizes="(min-width: 1024px) 220px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <p className="text-caption font-semibold text-neutral-500">
                    사진 {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={deletingPhotoId !== null}
                    className="h-8 px-2 text-caption font-semibold text-danger-muted hover:bg-danger-light/50"
                    onClick={() => handleDelete(photo.id)}
                  >
                    {deletingPhotoId === photo.id ? "삭제 중..." : "삭제"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

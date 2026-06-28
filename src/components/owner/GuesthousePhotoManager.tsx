"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GuesthousePhoto } from "@/types/database";
import {
  deleteGuesthousePhoto,
  uploadGuesthousePhoto,
} from "@/app/owner/guesthouse/edit/actions";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Section,
} from "@/components/ui";

interface GuesthousePhotoWithUrl extends GuesthousePhoto {
  publicUrl: string;
}

interface GuesthousePhotoManagerProps {
  guesthouseId: string;
  photos: GuesthousePhotoWithUrl[];
}

const MAX_PHOTO_COUNT = 5;

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
      alert("게스트하우스 사진은 최대 5장까지 업로드할 수 있습니다.");
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
      alert(error instanceof Error ? error.message : "사진 업로드에 실패했습니다.");
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
      alert(error instanceof Error ? error.message : "사진 삭제에 실패했습니다.");
    } finally {
      setDeletingPhotoId(null);
    }
  };

  return (
    <Section
      title="게스트하우스 사진"
      description="소개 사진은 최대 5장까지 업로드할 수 있습니다."
    >
      <Card>
        <CardHeader>
          <CardTitle>사진 업로드</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
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
              onClick={handleUpload}
              disabled={!canUpload || isUploading}
              className="shrink-0"
            >
              {isUploading ? "업로드 중..." : "사진 업로드"}
            </Button>
          </div>
          <p className="text-caption text-neutral-500">
            jpeg, png, webp 형식만 가능하며 1장당 최대 5MB입니다.
          </p>

          {photos.length === 0 ? (
            <div className="rounded-md border border-dashed border-neutral-200 px-4 py-8 text-center">
              <p className="text-body-sm text-neutral-500">
                업로드된 사진이 없습니다.
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
                      alt={photo.alt_text ?? `게스트하우스 사진 ${index + 1}`}
                      fill
                      sizes="(min-width: 1024px) 240px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 p-3">
                    <p className="text-caption text-neutral-500">
                      사진 {index + 1}
                    </p>
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
        </CardContent>
      </Card>
    </Section>
  );
}

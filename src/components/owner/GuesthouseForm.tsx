"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { GuesthouseFormData } from "@/types/database";
import { updateGuesthouse } from "@/app/owner/guesthouse/edit/actions";
import { JEJU_REGION_OPTIONS } from "@/lib/labels";
import { isUuid } from "@/lib/uuid";
import { GuesthousePhotoPicker } from "@/components/owner/GuesthousePhotoManager";
import {
  Button,
  ButtonLink,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Section,
  Select,
  Textarea,
} from "@/components/ui";

interface GuesthouseFormProps {
  mode: "create" | "edit";
  guesthouseId?: string;
  initialData?: GuesthouseFormData;
  createAction?: (
    payload: GuesthouseFormData,
    photoFormData?: FormData,
  ) => Promise<string | void>;
  cancelHref?: string;
  submitLabel?: string;
  photoManager?: ReactNode;
}

const emptyForm: GuesthouseFormData = {
  name: "",
  region: "제주시",
  address_text: "",
  map_url: "",
  contact_method: "",
  description: "",
};

function normalizeInitialData(
  initialData: GuesthouseFormData | undefined,
): GuesthouseFormData {
  const data = initialData ?? emptyForm;
  return {
    ...data,
    region: JEJU_REGION_OPTIONS.includes(
      data.region as (typeof JEJU_REGION_OPTIONS)[number],
    )
      ? data.region
      : "기타",
  };
}

export function GuesthouseForm({
  mode,
  guesthouseId,
  initialData,
  createAction,
  cancelHref = "/owner",
  submitLabel,
  photoManager,
}: GuesthouseFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<GuesthouseFormData>(
    normalizeInitialData(initialData),
  );
  const [guesthousePhotoFiles, setGuesthousePhotoFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMockEdit =
    mode === "edit" && (!guesthouseId || !isUuid(guesthouseId));

  const updateField = <K extends keyof GuesthouseFormData>(
    field: K,
    value: GuesthouseFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (mode === "create") {
      if (createAction) {
        try {
          const photoFormData =
            guesthousePhotoFiles.length > 0 ? new FormData() : undefined;
          guesthousePhotoFiles.forEach((file) => {
            photoFormData?.append("photos", file);
          });

          const redirectTo = await createAction(form, photoFormData);
          if (redirectTo) {
            router.push(redirectTo);
          }
        } catch (error) {
          alert(
            error instanceof Error
              ? error.message
              : "게스트하우스 정보 저장에 실패했습니다.",
          );
        }
      } else {
        //TODO: POST guesthouses
        // body: { owner_id, name, region, address_text, map_url, contact_method }
        //TODO: Toast로 성공 메시지 표시
        alert("게스트하우스 정보가 저장되었습니다.");
        router.push("/owner/jobs/new");
      }
    } else {
      if (!guesthouseId || isMockEdit) {
        alert("개발용 mock 데이터에서는 저장할 수 없습니다.");
        setIsSubmitting(false);
        return;
      }

      try {
        await updateGuesthouse(guesthouseId, form);
        alert("게스트하우스 정보가 수정되었습니다.");
        router.push("/owner/guesthouse");
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "게스트하우스 정보 수정에 실패했습니다.",
        );
      }
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <Section title="게스트하우스 기본 정보">
        <Card>
          <CardHeader>
            <CardTitle>
              {mode === "create" ? "새 게스트하우스 등록" : "게스트하우스 수정"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <Input
              label="게스트하우스명"
              name="name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="예: 제주 바람 게스트하우스"
              required
            />
            <Select
              label="지역"
              name="region"
              value={form.region}
              onChange={(e) => updateField("region", e.target.value)}
              required
            >
              {JEJU_REGION_OPTIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </Select>
            <div className="md:col-span-2">
              <Input
                label="주소"
                name="address_text"
                value={form.address_text}
                onChange={(e) => updateField("address_text", e.target.value)}
                placeholder="상세 주소를 입력해주세요"
                required
              />
            </div>
            <Input
              label="네이버지도 링크"
              name="map_url"
              value={form.map_url ?? ""}
              onChange={(e) => updateField("map_url", e.target.value)}
              placeholder="https://map.naver.com/..."
            />
            <Input
              label="연락 수단"
              name="contact_method"
              value={form.contact_method}
              onChange={(e) => updateField("contact_method", e.target.value)}
              placeholder="카카오톡 ID, 전화번호 등"
              helperText="지원자에게 안내될 연락 방법"
              required
            />
            <div className="md:col-span-2">
              <Textarea
                label="게스트하우스 설명"
                name="description"
                value={form.description ?? ""}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="게스트하우스 분위기, 주변 환경, 스탭에게 보여주고 싶은 소개를 입력해주세요"
              />
            </div>
            {photoManager && (
              <div className="border-t border-neutral-100 pt-5 md:col-span-2">
                {photoManager}
              </div>
            )}
            {mode === "create" && createAction && (
              <div className="border-t border-neutral-100 pt-5 md:col-span-2">
                <GuesthousePhotoPicker
                  disabled={isSubmitting}
                  onFilesChange={setGuesthousePhotoFiles}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </Section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {isMockEdit && (
          <p className="text-caption text-neutral-500 sm:mr-auto">
            개발용 mock 데이터에서는 저장할 수 없습니다.
          </p>
        )}
        <ButtonLink href={cancelHref} variant="outline">
          취소
        </ButtonLink>
        <Button type="submit" disabled={isSubmitting || isMockEdit}>
          {submitLabel ?? (mode === "create" ? "저장하기" : "수정 저장")}
        </Button>
      </div>
    </form>
  );
}

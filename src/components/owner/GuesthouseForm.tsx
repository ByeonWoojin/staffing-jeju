"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GuesthouseFormData } from "@/types/database";
import { updateGuesthouse } from "@/app/owner/guesthouse/edit/actions";
import { isUuid } from "@/lib/uuid";
import {
  Button,
  ButtonLink,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Section,
} from "@/components/ui";

interface GuesthouseFormProps {
  mode: "create" | "edit";
  guesthouseId?: string;
  initialData?: GuesthouseFormData;
  createAction?: (payload: GuesthouseFormData) => Promise<string | void>;
  cancelHref?: string;
  submitLabel?: string;
}

const emptyForm: GuesthouseFormData = {
  name: "",
  region: "",
  address_text: "",
  map_url: "",
  contact_method: "",
};

export function GuesthouseForm({
  mode,
  guesthouseId,
  initialData,
  createAction,
  cancelHref = "/owner",
  submitLabel,
}: GuesthouseFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<GuesthouseFormData>(
    initialData ?? emptyForm,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMockEdit =
    mode === "edit" && (!guesthouseId || !isUuid(guesthouseId));

  const updateField = (field: keyof GuesthouseFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (mode === "create") {
      if (createAction) {
        try {
          const redirectTo = await createAction(form);
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
        console.log("POST guesthouses", form);
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
            <Input
              label="지역"
              name="region"
              value={form.region}
              onChange={(e) => updateField("region", e.target.value)}
              placeholder="예: 제주시 애월"
              required
            />
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
              helperText="선택 입력"
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

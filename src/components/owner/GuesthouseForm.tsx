"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { GuesthouseFormData } from "@/types/database";
import {
  updateGuesthouse,
  type GuesthousePhotoUpdatePayload,
} from "@/app/owner/guesthouse/edit/actions";
import { JEJU_REGION_OPTIONS } from "@/lib/labels";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  getActionResultMessage,
  getSafeErrorMessage,
} from "@/lib/action-result";
import { COACHMARK_TARGETS } from "@/lib/onboarding/coachmark-config";
import { isUuid } from "@/lib/uuid";
import {
  GuesthousePhotoManager,
  type GuesthousePhotoDraft,
  type GuesthousePhotoWithUrl,
  type NewGuesthouseImage,
} from "@/components/owner/GuesthousePhotoManager";
import {
  removeUploadedGuesthousePhotoPaths,
  uploadGuesthousePhotoFiles,
  type UploadedGuesthousePhoto,
} from "@/lib/guesthouse-photo-upload";
import {
  AlertDialog,
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
    uploadedPhotoPaths?: string[],
  ) => Promise<{
    success: boolean;
    code?: string;
    message?: string;
    redirectTo?: string;
    guesthouseId?: string;
    created?: boolean;
  }>;
  cancelHref?: string;
  submitLabel?: string;
  initialPhotos?: GuesthousePhotoWithUrl[];
}

type FormStatus = {
  tone: "success" | "warning" | "danger";
  message: string;
};

type SubmitStage = "idle" | "uploading" | "saving";

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

function normalizeComparableText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function getComparableGuesthouseValues(form: GuesthouseFormData) {
  return {
    name: normalizeComparableText(form.name),
    region: normalizeComparableText(form.region),
    address_text: normalizeComparableText(form.address_text),
    map_url: normalizeComparableText(form.map_url),
    contact_method: normalizeComparableText(form.contact_method),
    description: normalizeComparableText(form.description),
  };
}

function hasComparableChanges(
  before: ReturnType<typeof getComparableGuesthouseValues>,
  after: ReturnType<typeof getComparableGuesthouseValues>,
) {
  return Object.entries(after).some(([key, value]) => {
    return before[key as keyof typeof before] !== value;
  });
}

function getStatusClassName(tone: FormStatus["tone"]) {
  if (tone === "success") {
    return "border-primary-100 bg-primary-50 text-primary-700";
  }
  if (tone === "warning") {
    return "border-primary-100 bg-primary-50/70 text-primary-700";
  }
  return "border-danger-light bg-danger-light text-danger-muted";
}

const emptyPhotoDraft: GuesthousePhotoDraft = {
  images: [],
  deletedExistingPhotoIds: [],
  hasChanges: false,
};

function getNewImages(draft: GuesthousePhotoDraft): NewGuesthouseImage[] {
  return draft.images.flatMap((image) =>
    image.type === "new" ? [image] : [],
  );
}

function buildPhotoUpdatePayload(
  draft: GuesthousePhotoDraft,
  uploadedPhotos: UploadedGuesthousePhoto[],
): GuesthousePhotoUpdatePayload {
  const uploadedPathByClientId = new Map(
    uploadedPhotos.map((photo) => [photo.clientId, photo.path]),
  );

  return {
    orderedPhotos: draft.images.map((image) => {
      if (image.type === "existing") {
        return { type: "existing", id: image.id };
      }

      const path = uploadedPathByClientId.get(image.clientId);
      if (!path) {
        throw new Error("사진 업로드 정보가 올바르지 않습니다.");
      }
      return { type: "new", path };
    }),
    deletedPhotoIds: draft.deletedExistingPhotoIds,
    uploadedPhotoPaths: uploadedPhotos.map((photo) => photo.path),
  };
}

function getUploadedPaths(uploadedPhotos: UploadedGuesthousePhoto[]) {
  return uploadedPhotos.map((photo) => photo.path);
}

export function GuesthouseForm({
  mode,
  guesthouseId,
  initialData,
  createAction,
  cancelHref = "/owner",
  submitLabel,
  initialPhotos = [],
}: GuesthouseFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<GuesthouseFormData>(
    normalizeInitialData(initialData),
  );
  const [photoDraft, setPhotoDraft] =
    useState<GuesthousePhotoDraft>(emptyPhotoDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState<SubmitStage>("idle");
  const [formStatus, setFormStatus] = useState<FormStatus | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const isMockEdit =
    mode === "edit" && (!guesthouseId || !isUuid(guesthouseId));
  const isEditDirty =
    mode !== "edit" ||
    !initialData ||
    photoDraft.hasChanges ||
    hasComparableChanges(
      getComparableGuesthouseValues(normalizeInitialData(initialData)),
      getComparableGuesthouseValues(form),
    );

  const handlePhotoDraftChange = useCallback((draft: GuesthousePhotoDraft) => {
    setPhotoDraft(draft);
    setFormStatus(null);
  }, []);

  const updateField = <K extends keyof GuesthouseFormData>(
    field: K,
    value: GuesthouseFormData[K],
  ) => {
    setFormStatus(null);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const showFormStatus = (status: FormStatus, showModal = false) => {
    setFormStatus(status);
    if (showModal && status.tone !== "success") {
      setAlertMessage(status.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStage("idle");
    setFormStatus(null);

    if (mode === "create") {
      if (createAction) {
        let uploadedPhotos: UploadedGuesthousePhoto[] = [];
        try {
          const newImages = getNewImages(photoDraft);
          if (newImages.length > 0) {
            setSubmitStage("uploading");
            setFormStatus({
              tone: "warning",
              message: "사진을 업로드하고 있습니다.",
            });
            uploadedPhotos = await uploadGuesthousePhotoFiles(
              newImages.map((image) => ({
                clientId: image.clientId,
                file: image.file,
              })),
            );
          }

          setSubmitStage("saving");
          setFormStatus({
            tone: "warning",
            message: "변경사항을 저장하고 있습니다.",
          });
          const result = await createAction(
            form,
            getUploadedPaths(uploadedPhotos),
          );
          if (!result.success) {
            await removeUploadedGuesthousePhotoPaths(
              getUploadedPaths(uploadedPhotos),
            );
            if (result.redirectTo) {
              router.push(result.redirectTo);
              return;
            }
            showFormStatus(
              {
                tone: "danger",
                message: getActionResultMessage(
                  result,
                  "게스트하우스 정보 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
                ),
              },
              true,
            );
            setIsSubmitting(false);
            setSubmitStage("idle");
            return;
          }

          if (result.redirectTo) {
            if (result.created && result.guesthouseId) {
              trackEvent(ANALYTICS_EVENTS.GUESTHOUSE_CREATE, {
                guesthouse_id: result.guesthouseId,
                user_role: "owner",
              });
            }
            router.push(result.redirectTo);
          }
        } catch (error) {
          await removeUploadedGuesthousePhotoPaths(
            getUploadedPaths(uploadedPhotos),
          );
          showFormStatus(
            {
              tone: "danger",
              message: getSafeErrorMessage(
                error,
                "게스트하우스 정보 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
              ),
            },
            true,
          );
        }
      } else {
        showFormStatus(
          {
            tone: "danger",
            message: "게스트하우스 저장 경로를 확인할 수 없습니다.",
          },
          true,
        );
      }
    } else {
      if (!guesthouseId || isMockEdit) {
        showFormStatus(
          {
            tone: "danger",
            message: "개발용 mock 데이터에서는 저장할 수 없습니다.",
          },
          true,
        );
        setIsSubmitting(false);
        return;
      }

      let uploadedPhotos: UploadedGuesthousePhoto[] = [];
      try {
        const newImages = getNewImages(photoDraft);
        if (newImages.length > 0) {
          setSubmitStage("uploading");
          setFormStatus({
            tone: "warning",
            message: "사진을 업로드하고 있습니다.",
          });
          uploadedPhotos = await uploadGuesthousePhotoFiles(
            newImages.map((image) => ({
              clientId: image.clientId,
              file: image.file,
            })),
            { guesthouseId },
          );
        }

        const photoPayload = photoDraft.hasChanges
          ? buildPhotoUpdatePayload(photoDraft, uploadedPhotos)
          : undefined;
        setSubmitStage("saving");
        setFormStatus({
          tone: "warning",
          message: "변경사항을 저장하고 있습니다.",
        });
        const result = await updateGuesthouse(guesthouseId, form, photoPayload);
        if (!result.success) {
          await removeUploadedGuesthousePhotoPaths(
            getUploadedPaths(uploadedPhotos),
          );
          showFormStatus(
            {
              tone: result.code === "NO_CHANGES" ? "warning" : "danger",
              message: getActionResultMessage(
                result,
                "변경사항을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
              ),
            },
            true,
          );
          setIsSubmitting(false);
          setSubmitStage("idle");
          return;
        }

        setFormStatus({ tone: "success", message: result.message });
        router.push("/owner/guesthouse");
      } catch (error) {
        await removeUploadedGuesthousePhotoPaths(
          getUploadedPaths(uploadedPhotos),
        );
        showFormStatus(
          {
            tone: "danger",
            message: getSafeErrorMessage(
              error,
              "게스트하우스 정보 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.",
            ),
          },
          true,
        );
      }
    }

    setIsSubmitting(false);
    setSubmitStage("idle");
  };

  const resolvedSubmitLabel =
    submitLabel ?? (mode === "create" ? "저장하기" : "수정 저장");
  const submitButtonLabel =
    submitStage === "uploading"
      ? "사진 업로드 중..."
      : submitStage === "saving"
        ? "저장 중..."
        : resolvedSubmitLabel;

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <Section title="게스트하우스 기본 정보">
          <Card
            data-coachmark={
              mode === "create"
                ? COACHMARK_TARGETS.ownerGuesthouseForm
                : undefined
            }
          >
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
            <div className="border-t border-neutral-100 pt-5 md:col-span-2">
              <GuesthousePhotoManager
                photos={initialPhotos}
                disabled={isSubmitting}
                onDraftChange={handlePhotoDraftChange}
              />
            </div>
            </CardContent>
          </Card>
        </Section>

        <div className="flex flex-col gap-3">
        {formStatus && (
          <p
            role="status"
            className={`rounded-lg border px-4 py-3 text-body-sm font-semibold ${getStatusClassName(
              formStatus.tone,
            )}`}
          >
            {formStatus.message}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {isMockEdit && (
            <p className="text-caption text-neutral-500 sm:mr-auto">
              개발용 mock 데이터에서는 저장할 수 없습니다.
            </p>
          )}
          <ButtonLink href={cancelHref} variant="outline">
            취소
          </ButtonLink>
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              isMockEdit ||
              (mode === "edit" && !isEditDirty)
            }
          >
            {submitButtonLabel}
          </Button>
        </div>
        </div>
      </form>
      <AlertDialog
        open={alertMessage !== null}
        message={alertMessage ?? ""}
        onClose={() => setAlertMessage(null)}
      />
    </>
  );
}

"use client";

import {
  useState,
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type WheelEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { JobPost, JobPostFormData } from "@/types/database";
import { updateJobPost } from "@/app/owner/jobs/[id]/edit/actions";
import { GENDER_CONDITION_LABELS, STIPEND_TYPE_LABELS } from "@/lib/labels";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { isUuid } from "@/lib/uuid";
import {
  Button,
  ButtonLink,
  Card,
  CardContent,
  Input,
  Select,
  Textarea,
} from "@/components/ui";

interface JobPostFormProps {
  mode: "create" | "edit";
  initialData?: JobPost;
  createAction?: (
    payload: JobPostFormData,
  ) => Promise<
    | string
    | void
    | {
        redirectTo: string;
        jobPostId?: string;
        guesthouseId?: string;
        created?: boolean;
      }
  >;
  cancelHref?: string;
  submitLabel?: string;
  photoManager?: ReactNode;
}

type NumericField =
  | "recruit_count"
  | "work_days_per_week"
  | "off_days_per_week";

type JobPostFormState = Omit<JobPostFormData, NumericField> &
  Record<NumericField, string>;

const defaultFormData: JobPostFormState = {
  title: "",
  recruit_count: "1",
  gender_condition: "any",
  age_condition: "",
  work_start_date: "",
  min_work_period: "",
  work_content: "",
  work_time: "",
  work_days_per_week: "5",
  off_days_per_week: "2",
  stipend_type: "none",
  stipend_description: "",
  provides_accommodation: false,
  provides_meal: false,
  has_party: false,
  party_description: "",
  is_urgent: false,
  preferred_conditions: "",
  caution: "",
  extra_info: "",
  description: "",
};

const invalidNumberFallbacks: Record<NumericField, number> = {
  recruit_count: 0,
  work_days_per_week: 0,
  off_days_per_week: -1,
};

function toNumberInputValue(value: number) {
  return String(value);
}

function normalizeNumericInput(value: string) {
  return value.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
}

function parseNumericField(form: JobPostFormState, field: NumericField) {
  const value = form[field].trim();
  if (!value) return invalidNumberFallbacks[field];
  return Number(value);
}

function jobPostToFormData(jobPost: JobPost): JobPostFormState {
  return {
    title: jobPost.title,
    recruit_count: toNumberInputValue(jobPost.recruit_count),
    gender_condition: jobPost.gender_condition,
    age_condition: jobPost.age_condition ?? "",
    work_start_date: jobPost.work_start_date,
    min_work_period: jobPost.min_work_period,
    work_content: jobPost.work_content,
    work_time: jobPost.work_time,
    work_days_per_week: toNumberInputValue(jobPost.work_days_per_week),
    off_days_per_week: toNumberInputValue(jobPost.off_days_per_week),
    stipend_type: jobPost.stipend_type,
    stipend_description: jobPost.stipend_description ?? "",
    provides_accommodation: jobPost.provides_accommodation,
    provides_meal: jobPost.provides_meal,
    has_party:
      jobPost.has_party || Boolean(jobPost.party_description?.trim()),
    party_description: jobPost.party_description ?? "",
    is_urgent: jobPost.is_urgent,
    preferred_conditions: jobPost.preferred_conditions ?? "",
    caution: jobPost.caution ?? "",
    extra_info: jobPost.extra_info ?? "",
    description: jobPost.description ?? "",
  };
}

function buildSubmitPayload(form: JobPostFormState): JobPostFormData {
  return {
    ...form,
    recruit_count: parseNumericField(form, "recruit_count"),
    work_days_per_week: parseNumericField(form, "work_days_per_week"),
    off_days_per_week: parseNumericField(form, "off_days_per_week"),
    stipend_description:
      form.stipend_type === "none" ? "" : form.stipend_description,
    party_description: form.has_party ? form.party_description : "",
  };
}

function getNumericValidationMessage(payload: JobPostFormData) {
  if (payload.recruit_count < 1) {
    return "모집 인원은 1명 이상이어야 합니다.";
  }
  if (payload.work_days_per_week < 1 || payload.work_days_per_week > 7) {
    return "근무일 수는 1~7 사이로 입력해 주세요.";
  }
  if (payload.off_days_per_week < 0 || payload.off_days_per_week > 6) {
    return "휴무일 수는 0~6 사이로 입력해 주세요.";
  }
  return null;
}

function handleNumericFocus(event: FocusEvent<HTMLInputElement>) {
  event.currentTarget.select();
}

function handleNumericKeyDown(event: KeyboardEvent<HTMLInputElement>) {
  if (["e", "E", "+", "-", ".", ","].includes(event.key)) {
    event.preventDefault();
  }
}

function handleNumericWheel(event: WheelEvent<HTMLInputElement>) {
  event.currentTarget.blur();
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-[22px] font-bold leading-tight text-neutral-900 md:text-[24px]">
          {title}
        </h2>
        <p className="text-body-sm text-neutral-500">{description}</p>
      </div>
      <Card padding="none" className="rounded-2xl border-neutral-100">
        <CardContent className="grid gap-6 p-5 md:p-8">
          {children}
        </CardContent>
      </Card>
    </section>
  );
}

function NumberInput({
  label,
  name,
  value,
  min,
  max,
  onValueChange,
  required = false,
  helperText,
}: {
  label: string;
  name: NumericField;
  value: string;
  min: number;
  max?: number;
  onValueChange: (value: string) => void;
  required?: boolean;
  helperText?: string;
}) {
  return (
    <Input
      label={label}
      name={name}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={value}
      onFocus={handleNumericFocus}
      onKeyDown={handleNumericKeyDown}
      onWheel={handleNumericWheel}
      onChange={(event) => {
        onValueChange(normalizeNumericInput(event.target.value));
      }}
      helperText={helperText}
      required={required}
    />
  );
}

function ConditionalPanel({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden={!open}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function ConditionalCheckboxField({
  label,
  name,
  checked,
  onChange,
  children,
}: {
  label: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3">
      <label
        htmlFor={name}
        className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 ${
          checked
            ? "border-primary-200 bg-primary-50 text-primary-700"
            : "border-neutral-200 bg-neutral-0 text-neutral-800 hover:bg-neutral-50"
        }`}
      >
        <input
          id={name}
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-5 w-5 shrink-0 rounded border-neutral-300 text-primary-500 accent-primary-500"
        />
        <span className="text-body-sm font-semibold">{label}</span>
      </label>
      <ConditionalPanel open={checked}>
        <div className="pt-1">{children}</div>
      </ConditionalPanel>
    </div>
  );
}

function ToggleCardCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-lg border px-4 py-3 transition-colors ${
        checked
          ? "border-primary-200 bg-primary-50 text-primary-700"
          : "border-neutral-200 bg-neutral-0 text-neutral-700 hover:bg-neutral-50"
      }`}
    >
      <span className="text-body-sm font-semibold">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="focus-ring h-5 w-5 rounded border-neutral-300 text-primary-500 accent-primary-500"
      />
    </label>
  );
}

function getWorkPatternSummary(workDays: string, offDays: string) {
  if (!workDays || !offDays) return null;

  const work = Number(workDays);
  const off = Number(offDays);

  if (!Number.isInteger(work) || work < 1 || work > 7) {
    return "근무일 수는 1~7 사이로 입력해 주세요.";
  }
  if (!Number.isInteger(off) || off < 0 || off > 6) {
    return "휴무일 수는 0~6 사이로 입력해 주세요.";
  }

  return `${work}일 근무 · ${off}일 휴무`;
}

export function JobPostForm({
  mode,
  initialData,
  createAction,
  cancelHref = "/owner/jobs",
  submitLabel,
  photoManager,
}: JobPostFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<JobPostFormState>(
    initialData ? jobPostToFormData(initialData) : defaultFormData,
  );
  const [hasPreferredConditions, setHasPreferredConditions] = useState(
    () => Boolean(initialData?.preferred_conditions?.trim()),
  );
  const [hasCaution, setHasCaution] = useState(
    () => Boolean(initialData?.caution?.trim()),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMockEdit =
    mode === "edit" && (!initialData || !isUuid(initialData.id));
  const workPatternSummary = getWorkPatternSummary(
    form.work_days_per_week,
    form.off_days_per_week,
  );
  const shouldShowStipendDetail = form.stipend_type !== "none";

  const updateField = <K extends keyof JobPostFormState>(
    field: K,
    value: JobPostFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateNumericField = (field: NumericField, value: string) => {
    updateField(field, value);
  };

  const handleStipendTypeChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    const stipendType = event.target.value as JobPostFormData["stipend_type"];
    setForm((prev) => ({
      ...prev,
      stipend_type: stipendType,
      stipend_description:
        stipendType === "none" ? "" : prev.stipend_description,
    }));
  };

  const setPartyEnabled = (enabled: boolean) => {
    setForm((prev) => ({
      ...prev,
      has_party: enabled,
      party_description: enabled ? prev.party_description : "",
    }));
  };

  const setPreferredEnabled = (enabled: boolean) => {
    setHasPreferredConditions(enabled);
    if (!enabled) {
      updateField("preferred_conditions", "");
    }
  };

  const setCautionEnabled = (enabled: boolean) => {
    setHasCaution(enabled);
    if (!enabled) {
      updateField("caution", "");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = buildSubmitPayload(form);
    const numericValidationMessage = getNumericValidationMessage(payload);
    if (numericValidationMessage) {
      alert(numericValidationMessage);
      setIsSubmitting(false);
      return;
    }

    if (mode === "create") {
      if (createAction) {
        try {
          const redirectTo = await createAction(payload);
          if (typeof redirectTo === "string") {
            router.push(redirectTo);
          } else if (redirectTo) {
            if (
              redirectTo.created &&
              redirectTo.jobPostId &&
              redirectTo.guesthouseId
            ) {
              trackEvent(ANALYTICS_EVENTS.JOB_POST_CREATE, {
                job_post_id: redirectTo.jobPostId,
                guesthouse_id: redirectTo.guesthouseId,
                user_role: "owner",
              });
            }
            router.push(redirectTo.redirectTo);
          }
        } catch (error) {
          alert(
            error instanceof Error
              ? error.message
              : "모집글 저장에 실패했습니다.",
          );
        }
        setIsSubmitting(false);
        return;
      }

      alert("모집글 저장 경로를 확인할 수 없습니다.");
    } else {
      if (!initialData || isMockEdit) {
        alert("개발용 mock 데이터에서는 저장할 수 없습니다.");
        setIsSubmitting(false);
        return;
      }

      try {
        await updateJobPost(initialData.id, payload);
        alert("모집글이 수정되었습니다.");
        router.push("/owner/jobs");
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "모집글 수정에 실패했습니다.",
        );
      }
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10 pb-4">
      <FormSection
        title="모집 기본 정보"
        description="스탭이 모집글 목록과 상세 화면에서 가장 먼저 확인하는 정보예요."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Input
              label="모집 제목"
              labelHelpText="스탭이 보는 모집글 목록과 모집글 상세 화면의 제목으로 표시됩니다."
              name="title"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="예: 여름 시즌 프론트 스탭 모집"
              required
            />
          </div>
          <NumberInput
            label="모집 인원"
            name="recruit_count"
            value={form.recruit_count}
            min={1}
            onValueChange={(value) => updateNumericField("recruit_count", value)}
            required
          />
          <Select
            label="성별 조건"
            name="gender_condition"
            value={form.gender_condition}
            onChange={(event) =>
              updateField(
                "gender_condition",
                event.target.value as JobPostFormData["gender_condition"],
              )
            }
            required
          >
            {Object.entries(GENDER_CONDITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input
            label="나이 조건"
            labelMeta="선택"
            name="age_condition"
            value={form.age_condition ?? ""}
            onChange={(event) => updateField("age_condition", event.target.value)}
            placeholder="예: 20대~30대"
          />
        </div>
      </FormSection>

      <FormSection
        title="근무 조건"
        description="실제 근무 일정과 맡게 될 업무를 입력해 주세요."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Input
            label="근무 시작일"
            name="work_start_date"
            type="date"
            value={form.work_start_date}
            onChange={(event) =>
              updateField("work_start_date", event.target.value)
            }
            required
          />
          <Input
            label="최소 근무 기간"
            name="min_work_period"
            value={form.min_work_period}
            onChange={(event) =>
              updateField("min_work_period", event.target.value)
            }
            placeholder="예: 1개월 이상"
            required
          />
          <div className="grid gap-2 md:col-span-2">
            <div className="grid gap-5 md:grid-cols-2">
              <NumberInput
                label="근무일 수"
                name="work_days_per_week"
                value={form.work_days_per_week}
                min={1}
                max={7}
                onValueChange={(value) =>
                  updateNumericField("work_days_per_week", value)
                }
                required
              />
              <NumberInput
                label="휴무일 수"
                name="off_days_per_week"
                value={form.off_days_per_week}
                min={0}
                max={6}
                onValueChange={(value) =>
                  updateNumericField("off_days_per_week", value)
                }
                required
              />
            </div>
            <p className="text-[13px] font-medium text-neutral-500">
              반복되는 근무 패턴을 기준으로 입력해 주세요.
            </p>
            {workPatternSummary && (
              <p
                className={`rounded-md px-3 py-2 text-[13px] font-semibold ${
                  workPatternSummary.includes("입력")
                    ? "bg-danger-light text-danger-muted"
                    : "bg-neutral-50 text-neutral-600"
                }`}
              >
                {workPatternSummary}
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <Input
              label="근무 시간"
              name="work_time"
              value={form.work_time}
              onChange={(event) => updateField("work_time", event.target.value)}
              placeholder="예: 09:00 ~ 18:00 (점심 1시간)"
              required
            />
          </div>
          <div className="md:col-span-2">
            <Textarea
              label="업무 내용"
              labelHelpText="스탭이 실제로 맡게 될 업무를 구체적으로 작성해 주세요."
              name="work_content"
              value={form.work_content}
              onChange={(event) =>
                updateField("work_content", event.target.value)
              }
              placeholder="담당 업무를 구체적으로 작성해주세요"
              required
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="제공 조건"
        description="급여, 숙소, 식사 등 스탭에게 제공하는 조건을 입력해 주세요."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Select
            label="급여·보상 지급 여부"
            name="stipend_type"
            value={form.stipend_type}
            onChange={handleStipendTypeChange}
            required
          >
            {Object.entries(STIPEND_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <div className="md:col-span-2">
            <ConditionalPanel open={shouldShowStipendDetail}>
              <Input
                label="급여·보상 상세"
                labelMeta="선택"
                labelHelpText="숙소, 식사, 급여와 활동비 등 스탭에게 제공하는 조건을 정확하게 작성해 주세요."
                name="stipend_description"
                value={form.stipend_description ?? ""}
                onChange={(event) =>
                  updateField("stipend_description", event.target.value)
                }
                placeholder="예: 월 80만 원, 매월 말일 지급"
                disabled={!shouldShowStipendDetail}
              />
            </ConditionalPanel>
          </div>
          <ToggleCardCheckbox
            label="숙소 제공"
            checked={form.provides_accommodation}
            onChange={(checked) => updateField("provides_accommodation", checked)}
          />
          <ToggleCardCheckbox
            label="식사 제공"
            checked={form.provides_meal}
            onChange={(checked) => updateField("provides_meal", checked)}
          />
        </div>
      </FormSection>

      <FormSection
        title="상세 소개와 사진"
        description="게스트하우스의 분위기와 모집 내용을 자세히 소개해 주세요."
      >
        <div className="grid gap-5">
          <Textarea
            label="상세 설명"
            labelMeta="선택"
            labelHelpText="스탭이 모집글 상세에서 게스트하우스의 분위기와 모집글의 특징을 확인하는 내용입니다."
            name="description"
            value={form.description ?? ""}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="게스트하우스 분위기, 하루 일과, 함께하고 싶은 스탭의 모습을 소개해 주세요."
            className="min-h-40"
          />
          {photoManager && (
            <div className="border-t border-neutral-100 pt-5">
              {photoManager}
            </div>
          )}
        </div>
      </FormSection>

      <FormSection
        title="추가 운영 정보"
        description="해당하는 내용이 있을 때만 선택하고 작성해 주세요."
      >
        <div className="grid gap-5">
          <ConditionalCheckboxField
            label="파티를 운영해요"
            name="has_party"
            checked={form.has_party}
            onChange={setPartyEnabled}
          >
            <Textarea
              label="파티 운영 안내"
              labelMeta="선택"
              name="party_description"
              value={form.party_description ?? ""}
              onChange={(event) =>
                updateField("party_description", event.target.value)
              }
              placeholder="예: 주 2회 파티 운영, 준비와 정리 업무 포함"
              disabled={!form.has_party}
            />
          </ConditionalCheckboxField>

          <ConditionalCheckboxField
            label="우대사항이 있어요"
            name="has_preferred_conditions"
            checked={hasPreferredConditions}
            onChange={setPreferredEnabled}
          >
            <Textarea
              label="우대사항"
              name="preferred_conditions"
              value={form.preferred_conditions ?? ""}
              onChange={(event) =>
                updateField("preferred_conditions", event.target.value)
              }
              placeholder="예: 관련 경험자, 외국어 가능자, 장기 근무 가능자"
              disabled={!hasPreferredConditions}
            />
          </ConditionalCheckboxField>

          <ConditionalCheckboxField
            label="지원자가 미리 알아야 할 주의사항이 있어요"
            name="has_caution"
            checked={hasCaution}
            onChange={setCautionEnabled}
          >
            <Textarea
              label="주의사항"
              name="caution"
              value={form.caution ?? ""}
              onChange={(event) => updateField("caution", event.target.value)}
              placeholder="지원 전에 반드시 확인해야 할 내용을 작성해 주세요."
              disabled={!hasCaution}
            />
          </ConditionalCheckboxField>
        </div>
      </FormSection>

      <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 pt-6 sm:flex-row sm:justify-end">
        {isMockEdit && (
          <p className="text-caption text-neutral-500 sm:mr-auto">
            개발용 mock 데이터에서는 저장할 수 없습니다.
          </p>
        )}
        <ButtonLink href={cancelHref} variant="outline">
          취소
        </ButtonLink>
        <Button type="submit" disabled={isSubmitting || isMockEdit}>
          {submitLabel ??
            (mode === "create" ? "스탭 모집글 작성하기" : "변경사항 저장")}
        </Button>
      </div>
    </form>
  );
}

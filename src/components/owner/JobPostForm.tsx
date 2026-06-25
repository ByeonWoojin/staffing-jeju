"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { JobPost, JobPostFormData } from "@/types/database";
import { updateJobPost } from "@/app/owner/jobs/[id]/edit/actions";
import {
  GENDER_CONDITION_LABELS,
  STIPEND_TYPE_LABELS,
} from "@/lib/labels";
import { isUuid } from "@/lib/uuid";
import {
  createJobPostFromFormMock,
  getCurrentOwnerMock,
  getOwnerGuesthouseMock,
} from "@/lib/owner-data";
import { saveCreatedJobPostToSession } from "@/lib/owner-utils";
import {
  Button,
  ButtonLink,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Section,
  Select,
  Textarea,
} from "@/components/ui";

interface JobPostFormProps {
  mode: "create" | "edit";
  initialData?: JobPost;
}

const defaultFormData: JobPostFormData = {
  title: "",
  recruit_count: 1,
  gender_condition: "any",
  age_condition: "",
  work_start_date: "",
  min_work_period: "",
  work_content: "",
  work_time: "",
  work_days_per_week: 5,
  off_days_per_week: 2,
  stipend_type: "none",
  stipend_description: "",
  provides_accommodation: false,
  provides_meal: false,
  is_urgent: false,
  preferred_conditions: "",
  caution: "",
  extra_info: "",
  description: "",
};

function jobPostToFormData(jobPost: JobPost): JobPostFormData {
  return {
    title: jobPost.title,
    recruit_count: jobPost.recruit_count,
    gender_condition: jobPost.gender_condition,
    age_condition: jobPost.age_condition ?? "",
    work_start_date: jobPost.work_start_date,
    min_work_period: jobPost.min_work_period,
    work_content: jobPost.work_content,
    work_time: jobPost.work_time,
    work_days_per_week: jobPost.work_days_per_week,
    off_days_per_week: jobPost.off_days_per_week,
    stipend_type: jobPost.stipend_type,
    stipend_description: jobPost.stipend_description ?? "",
    provides_accommodation: jobPost.provides_accommodation,
    provides_meal: jobPost.provides_meal,
    is_urgent: jobPost.is_urgent,
    preferred_conditions: jobPost.preferred_conditions ?? "",
    caution: jobPost.caution ?? "",
    extra_info: jobPost.extra_info ?? "",
    description: jobPost.description ?? "",
  };
}

export function JobPostForm({ mode, initialData }: JobPostFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<JobPostFormData>(
    initialData ? jobPostToFormData(initialData) : defaultFormData,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMockEdit =
    mode === "edit" && (!initialData || !isUuid(initialData.id));

  const updateField = <K extends keyof JobPostFormData>(
    field: K,
    value: JobPostFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const owner = getCurrentOwnerMock();
    const guesthouse = getOwnerGuesthouseMock(owner.id);

    if (mode === "create") {
      //TODO: GET guesthouse where owner_id = currentOwner.id
      //TODO: POST job_posts
      if (!guesthouse) {
        alert("먼저 게스트하우스 정보를 등록해주세요.");
        router.push("/owner/guesthouse/new");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        guesthouse_id: guesthouse.id,
        owner_id: owner.id,
        slug: "",
        ...form,
        age_condition: form.age_condition || null,
        stipend_description: form.stipend_description || null,
        preferred_conditions: form.preferred_conditions || null,
        caution: form.caution || null,
        extra_info: form.extra_info || null,
        description: form.description || null,
        status: "open" as const,
        bumped_at: new Date().toISOString(),
        last_bumped_at: null,
        bump_count: 0,
      };

      console.log("POST job_posts", payload);

      const created = createJobPostFromFormMock(
        owner.id,
        guesthouse.id,
        form,
      );
      saveCreatedJobPostToSession(created);
      router.push(`/owner/jobs/${created.id}/complete`);
    } else {
      if (!initialData || isMockEdit) {
        alert("개발용 mock 데이터에서는 저장할 수 없습니다.");
        setIsSubmitting(false);
        return;
      }

      try {
        await updateJobPost(initialData.id, form);
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <Section title="기본 정보" description="모집 개요를 입력합니다">
        <Card>
          <CardContent className="grid gap-5 md:grid-cols-2 pt-5 md:pt-6">
            <div className="md:col-span-2">
              <Input
                label="모집 제목"
                name="title"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="예: 여름 시즌 프론트 스탭 모집"
                required
              />
            </div>
            <Input
              label="모집 인원"
              name="recruit_count"
              type="number"
              min={1}
              value={form.recruit_count}
              onChange={(e) =>
                updateField("recruit_count", Number(e.target.value))
              }
              required
            />
            <Select
              label="성별 조건"
              name="gender_condition"
              value={form.gender_condition}
              onChange={(e) =>
                updateField(
                  "gender_condition",
                  e.target.value as JobPostFormData["gender_condition"],
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
              name="age_condition"
              value={form.age_condition ?? ""}
              onChange={(e) => updateField("age_condition", e.target.value)}
              placeholder="예: 20대~30대"
              helperText="선택 입력"
            />
            {mode === "create" && (
              <div className="flex items-end">
                <Checkbox
                  label="급구"
                  name="is_urgent"
                  checked={form.is_urgent}
                  onChange={(e) => updateField("is_urgent", e.target.checked)}
                  description="급하게 스탭을 구하는 공고입니다"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </Section>

      <Section title="근무 조건" description="근무 일정과 업무 내용">
        <Card>
          <CardHeader>
            <CardTitle className="text-body-sm font-semibold text-neutral-600">
              필수 입력 항목
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <Input
              label="근무 시작일"
              name="work_start_date"
              type="date"
              value={form.work_start_date}
              onChange={(e) => updateField("work_start_date", e.target.value)}
              required
            />
            <Input
              label="최소 근무 기간"
              name="min_work_period"
              value={form.min_work_period}
              onChange={(e) => updateField("min_work_period", e.target.value)}
              placeholder="예: 1개월 이상"
              required
            />
            <Input
              label="주 N일 근무"
              name="work_days_per_week"
              type="number"
              min={1}
              max={7}
              value={form.work_days_per_week}
              onChange={(e) =>
                updateField("work_days_per_week", Number(e.target.value))
              }
              required
            />
            <Input
              label="주 N일 휴무"
              name="off_days_per_week"
              type="number"
              min={0}
              max={6}
              value={form.off_days_per_week}
              onChange={(e) =>
                updateField("off_days_per_week", Number(e.target.value))
              }
              required
            />
            <div className="md:col-span-2">
              <Input
                label="근무 시간"
                name="work_time"
                value={form.work_time}
                onChange={(e) => updateField("work_time", e.target.value)}
                placeholder="예: 09:00 ~ 18:00 (점심 1시간)"
                required
              />
            </div>
            <div className="md:col-span-2">
              <Textarea
                label="업무 내용"
                name="work_content"
                value={form.work_content}
                onChange={(e) => updateField("work_content", e.target.value)}
                placeholder="담당 업무를 구체적으로 작성해주세요"
                required
              />
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section title="제공 조건" description="급여 및 숙식 제공 여부">
        <Card>
          <CardContent className="grid gap-5 md:grid-cols-2 pt-5 md:pt-6">
            <Select
              label="급여/지원금"
              name="stipend_type"
              value={form.stipend_type}
              onChange={(e) =>
                updateField(
                  "stipend_type",
                  e.target.value as JobPostFormData["stipend_type"],
                )
              }
              required
            >
              {Object.entries(STIPEND_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Input
              label="급여/지원금 상세"
              name="stipend_description"
              value={form.stipend_description ?? ""}
              onChange={(e) =>
                updateField("stipend_description", e.target.value)
              }
              placeholder="예: 월 80만원 + 식사 제공"
              helperText="선택 입력"
            />
            <Checkbox
              label="숙소 제공"
              name="provides_accommodation"
              checked={form.provides_accommodation}
              onChange={(e) =>
                updateField("provides_accommodation", e.target.checked)
              }
            />
            <Checkbox
              label="식사 제공"
              name="provides_meal"
              checked={form.provides_meal}
              onChange={(e) => updateField("provides_meal", e.target.checked)}
            />
          </CardContent>
        </Card>
      </Section>

      <Section title="상세 안내" description="우대사항 및 주의사항">
        <Card>
          <CardContent className="grid gap-5 pt-5 md:pt-6">
            <Textarea
              label="우대사항"
              name="preferred_conditions"
              value={form.preferred_conditions ?? ""}
              onChange={(e) =>
                updateField("preferred_conditions", e.target.value)
              }
              placeholder="우대하는 조건이 있다면 작성해주세요"
            />
            <Textarea
              label="주의사항"
              name="caution"
              value={form.caution ?? ""}
              onChange={(e) => updateField("caution", e.target.value)}
              placeholder="지원자가 알아야 할 주의사항"
            />
            <Textarea
              label="기타 안내"
              name="extra_info"
              value={form.extra_info ?? ""}
              onChange={(e) => updateField("extra_info", e.target.value)}
            />
            <Textarea
              label="상세 설명"
              name="description"
              value={form.description ?? ""}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="모집글에 대한 추가 설명"
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
        <ButtonLink href="/owner/jobs" variant="outline">
          {mode === "create" ? "취소" : "돌아가기"}
        </ButtonLink>
        <Button type="submit" disabled={isSubmitting || isMockEdit}>
          {mode === "create" ? "스탭 모집글 작성하기" : "변경사항 저장"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitJobApplication } from "./actions";
import { Button, Card, Input, Select, Textarea } from "@/components/ui";

interface ApplicationFormProps {
  slug: string;
  defaultName: string;
  defaultPhone: string;
  defaultAvailableStartDate: string;
}

export function ApplicationForm({
  slug,
  defaultName,
  defaultPhone,
  defaultAvailableStartDate,
}: ApplicationFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;

    setIsPending(true);
    setMessage(null);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await submitJobApplication(slug, formData);

      if (!result.ok) {
        setMessage(result.message);
        if (result.redirectTo) {
          router.push(result.redirectTo);
        }
        return;
      }

      alert(result.message);
      router.push(result.redirectTo);
      router.refresh();
    } catch (error) {
      console.error("[ApplicationForm] submit failed", error);
      setMessage("지원서 제출에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="이름"
            name="name"
            defaultValue={defaultName}
            required
            autoComplete="name"
          />
          <Input
            label="나이"
            name="age"
            type="number"
            min={1}
            inputMode="numeric"
            required
            placeholder="예: 26"
          />
          <Select label="성별" name="gender" defaultValue="" required>
            <option value="" disabled>
              성별 선택
            </option>
            <option value="female">여성</option>
            <option value="male">남성</option>
          </Select>
          <Input
            label="연락처"
            name="phone"
            type="tel"
            defaultValue={defaultPhone}
            required
            autoComplete="tel"
            placeholder="010-0000-0000"
          />
          <Input
            label="입도 가능일"
            name="availableStartDate"
            type="date"
            defaultValue={defaultAvailableStartDate}
            required
          />
          <Input
            label="가능 근무 기간"
            name="availableWorkPeriod"
            required
            placeholder="예: 2개월"
          />
          <Select
            label="게스트하우스 스탭 경험"
            name="experienceStatus"
            defaultValue=""
            required
          >
            <option value="" disabled>
              경험 선택
            </option>
            <option value="none">경험 없음</option>
            <option value="experienced">경험 있음</option>
          </Select>
          <div className="flex w-full flex-col gap-1.5">
            <label
              htmlFor="representativePhoto"
              className="text-body-sm font-semibold text-neutral-800"
            >
              대표사진
            </label>
            <input
              id="representativePhoto"
              name="representativePhoto"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="block h-11 w-full rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-body-sm text-neutral-800 file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-caption file:font-bold file:text-primary-700 focus-ring"
            />
            <p className="text-[13px] text-neutral-500">
              JPG, PNG, WEBP 형식만 가능하며 최대 5MB입니다.
            </p>
          </div>
        </div>

        <Textarea
          label="자기소개 또는 지원 메시지"
          name="introduction"
          required
          placeholder="게스트하우스 경험, 가능한 업무, 제주에서 일하고 싶은 이유를 적어주세요."
          className="min-h-40"
        />

        {message && (
          <p className="rounded-md border border-danger-light bg-danger-light px-4 py-3 text-body-sm font-semibold text-danger-muted">
            {message}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={isPending}
          >
            돌아가기
          </Button>
          <Button type="submit" disabled={isPending} className="sm:min-w-36">
            {isPending ? "제출 중..." : "지원서 제출"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

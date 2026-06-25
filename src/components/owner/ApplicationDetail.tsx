"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Application, JobPost } from "@/types/database";
import {
  acceptApplication,
  rejectApplication,
} from "@/app/owner/applications/actions";
import { formatDate } from "@/lib/owner-utils";
import {
  getApplicationStatusLabel,
  getExperienceStatusLabel,
  getGenderConditionLabel,
} from "@/lib/labels";
import {
  ApplicationStatusBadge,
  Button,
  ButtonLink,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Section,
} from "@/components/ui";

interface ApplicationDetailProps {
  application: Application;
  jobPost: JobPost;
}

export function ApplicationDetail({
  application: initialApplication,
  jobPost,
}: ApplicationDetailProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const application = initialApplication;
  const canDecide =
    application.status === "submitted" || application.status === "viewed";

  const handleAccept = async () => {
    if (!canDecide) return;
    if (!confirm("이 지원자를 채용합격 처리하시겠습니까?")) return;
    setIsUpdating(true);
    try {
      await acceptApplication(application.id);
      router.refresh();
      alert("채용합격 처리되었습니다.");
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "채용합격 처리에 실패했습니다.",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!canDecide) return;
    if (!confirm("이 지원자를 불합격 처리하시겠습니까?")) return;
    setIsUpdating(true);
    try {
      await rejectApplication(application.id);
      router.refresh();
      alert("불합격 처리되었습니다.");
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "불합격 처리에 실패했습니다.",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <Section title="지원자 정보">
        <Card>
          <CardContent className="flex flex-col gap-6 pt-5 md:pt-6 sm:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={application.representative_photo_path}
              alt={`${application.name} 대표사진`}
              className="h-32 w-32 shrink-0 rounded-lg object-cover border border-neutral-200 mx-auto sm:mx-0"
            />
            <dl className="grid flex-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-caption text-neutral-400">이름</dt>
                <dd className="text-body font-semibold text-neutral-800">
                  {application.name}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-neutral-400">나이 · 성별</dt>
                <dd className="text-body-sm text-neutral-700">
                  {application.age}세 ·{" "}
                  {getGenderConditionLabel(application.gender)}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-neutral-400">연락처</dt>
                <dd className="text-body-sm text-neutral-700">
                  {application.phone}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-neutral-400">지원 상태</dt>
                <dd className="mt-0.5">
                  <ApplicationStatusBadge status={application.status} />
                </dd>
              </div>
              <div>
                <dt className="text-caption text-neutral-400">입도 가능일</dt>
                <dd className="text-body-sm text-neutral-700">
                  {formatDate(application.available_start_date)}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-neutral-400">
                  가능 근무 기간
                </dt>
                <dd className="text-body-sm text-neutral-700">
                  {application.available_work_period}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-neutral-400">스탭 경험</dt>
                <dd className="text-body-sm text-neutral-700">
                  {getExperienceStatusLabel(application.experience_status)}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-neutral-400">지원일</dt>
                <dd className="text-body-sm text-neutral-700">
                  {formatDate(application.created_at)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </Section>

      <Section title="자기소개">
        <Card>
          <CardContent className="pt-5 md:pt-6">
            <p className="whitespace-pre-wrap text-body-sm text-neutral-700 leading-relaxed">
              {application.introduction}
            </p>
          </CardContent>
        </Card>
      </Section>

      <Section title="지원 모집글">
        <Card padding="sm">
          <CardContent>
            <p className="text-body-sm font-semibold text-neutral-800">
              {jobPost.title}
            </p>
            <ButtonLink
              href={`/owner/jobs/${jobPost.id}/applications`}
              variant="ghost"
              size="sm"
              className="mt-2 px-0"
            >
              현재 모집글 지원자 목록
            </ButtonLink>
          </CardContent>
        </Card>
      </Section>

      <Section title="상태 변경">
        <Card>
          <CardHeader>
            <CardTitle className="text-body-sm">
              현재: {getApplicationStatusLabel(application.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!canDecide ? (
              <p className="text-body-sm text-neutral-500">
                이 지원서는 더 이상 상태를 변경할 수 없습니다.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleAccept} disabled={isUpdating}>
                  {isUpdating ? "처리 중..." : "채용합격 처리"}
                </Button>
                <Button
                  variant="outline-danger"
                  onClick={handleReject}
                  disabled={isUpdating}
                >
                  {isUpdating ? "처리 중..." : "불합격 처리"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Application, ApplicationStatus, JobPost } from "@/types/database";
import { formatDate } from "@/lib/owner-utils";
import {
  getApplicationStatusLabel,
  getExperienceStatusLabel,
  getGenderConditionLabel,
} from "@/lib/labels";
import { getAllowedStatusTransitions } from "@/lib/owner-data";
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
  const [application, setApplication] = useState(initialApplication);
  const [isUpdating, setIsUpdating] = useState(false);

  const allowedTransitions = getAllowedStatusTransitions(application.status);

  //TODO: If application.status === 'submitted', PATCH applications.status = 'viewed'
  //TODO: INSERT application_status_logs from submitted to viewed

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    if (!allowedTransitions.includes(newStatus)) return;

    const label = getApplicationStatusLabel(newStatus);
    if (
      !confirm(`지원 상태를 "${label}"(으)로 변경하시겠습니까?`)
    ) {
      return;
    }

    setIsUpdating(true);

    //TODO: PATCH applications.status
    //TODO: INSERT application_status_logs with application_id, changed_by, from_status, to_status, memo
    console.log("PATCH applications.status", {
      application_id: application.id,
      from_status: application.status,
      to_status: newStatus,
    });

    setApplication((prev) => ({
      ...prev,
      status: newStatus,
      updated_at: new Date().toISOString(),
    }));

    //TODO: Toast로 상태 변경 완료 표시
    alert(`지원 상태가 "${label}"(으)로 변경되었습니다.`);
    setIsUpdating(false);
    router.refresh();
  };

  const isStatusLocked = allowedTransitions.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <Section title="지원자 정보">
        <Card>
          <CardContent className="flex flex-col gap-6 pt-5 md:pt-6 sm:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={application.representative_photo_url}
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
            {isStatusLocked ? (
              <p className="text-body-sm text-neutral-500">
                이 지원서는 더 이상 상태를 변경할 수 없습니다.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {allowedTransitions.includes("accepted") && (
                  <Button
                    onClick={() => handleStatusChange("accepted")}
                    disabled={isUpdating}
                  >
                    채용합격 처리
                  </Button>
                )}
                {allowedTransitions.includes("rejected") && (
                  <Button
                    variant="outline-danger"
                    onClick={() => handleStatusChange("rejected")}
                    disabled={isUpdating}
                  >
                    불합격 처리
                  </Button>
                )}
                {allowedTransitions.includes("viewed") && (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange("viewed")}
                    disabled={isUpdating}
                  >
                    열람 처리
                  </Button>
                )}
                {allowedTransitions.includes("canceled") && (
                  <Button
                    variant="ghost"
                    onClick={() => handleStatusChange("canceled")}
                    disabled={isUpdating}
                  >
                    지원취소 처리
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}

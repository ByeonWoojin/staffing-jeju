"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Application, JobPost } from "@/types/database";
import {
  acceptApplication,
  closeRecruitmentAfterHiring,
  rejectApplication,
  type AcceptApplicationResult,
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
  application: Application & { representativePhotoUrl?: string | null };
  jobPost: JobPost;
}

export function ApplicationDetail({
  application: initialApplication,
  jobPost,
}: ApplicationDetailProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isClosingRecruitment, setIsClosingRecruitment] = useState(false);
  const [hiringResult, setHiringResult] =
    useState<AcceptApplicationResult | null>(null);

  const application = initialApplication;
  const photoSrc =
    application.representativePhotoUrl ?? application.representative_photo_path;
  const canDecide =
    application.status === "submitted" || application.status === "viewed";
  const closeRecruitmentDisabled =
    isClosingRecruitment ||
    !hiringResult?.canCloseRecruitment ||
    hiringResult?.jobPostStatus === "closed";

  const handleAccept = async () => {
    if (!canDecide) return;
    if (!confirm("이 지원자를 채용합격 처리하시겠습니까?")) return;
    setIsUpdating(true);
    try {
      const result = await acceptApplication(application.id);
      setHiringResult(result);
      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "채용합격 처리에 실패했습니다.",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleContinueRecruiting = () => {
    setHiringResult(null);
    router.refresh();
  };

  const handleCloseRecruitment = async () => {
    if (!hiringResult || isClosingRecruitment) return;

    setIsClosingRecruitment(true);
    try {
      await closeRecruitmentAfterHiring({
        jobPostId: hiringResult.jobPostId,
        applicationId: hiringResult.applicationId,
      });
      setHiringResult(null);
      router.refresh();
      alert("모집이 마감되었습니다.");
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "모집 마감 처리에 실패했습니다.",
      );
    } finally {
      setIsClosingRecruitment(false);
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
      {hiringResult && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-900/30 px-4 py-6 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hiring-complete-title"
            className="w-full max-w-md rounded-lg border border-neutral-200 bg-neutral-0 p-5 shadow-lg"
          >
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-caption font-bold text-primary-700">
                  채용 현황 {hiringResult.acceptedCount}/
                  {hiringResult.recruitCount}
                </p>
                <h2
                  id="hiring-complete-title"
                  className="mt-1 text-title text-neutral-900"
                >
                  채용합격 처리가 완료되었습니다
                </h2>
              </div>

              {hiringResult.isRecruitmentFilled ? (
                <p className="text-body-sm text-neutral-600">
                  모집 인원을 모두 채웠습니다. 이제 모집글을 마감할까요?
                </p>
              ) : (
                <p className="text-body-sm text-neutral-600">
                  현재 모집 인원 {hiringResult.recruitCount}명 중{" "}
                  {hiringResult.acceptedCount}명을 채용했습니다. 모집을 계속
                  진행하거나, 모집을 마감할 수 있습니다.
                </p>
              )}

              {!hiringResult.canCloseRecruitment && (
                <p className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-caption text-neutral-600">
                  현재 사장님이 관리할 수 없는 모집글이거나 숨김 처리된
                  모집글이라 마감할 수 없습니다.
                </p>
              )}
              {hiringResult.jobPostStatus === "closed" && (
                <p className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-caption text-neutral-600">
                  이미 마감된 모집글입니다.
                </p>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleContinueRecruiting}
                  disabled={isClosingRecruitment}
                >
                  계속 모집
                </Button>
                <Button
                  type="button"
                  variant="outline-danger"
                  onClick={handleCloseRecruitment}
                  disabled={closeRecruitmentDisabled}
                >
                  {isClosingRecruitment ? "마감 중..." : "모집 마감"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Section title="지원자 정보">
        <Card>
          <CardContent className="flex flex-col gap-6 pt-5 md:pt-6 sm:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoSrc}
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

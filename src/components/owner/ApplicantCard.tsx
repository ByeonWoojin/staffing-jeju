import Link from "next/link";
import type { Application } from "@/types/database";
import { formatDate } from "@/lib/owner-utils";
import {
  getExperienceStatusLabel,
  getGenderConditionLabel,
} from "@/lib/labels";
import { ApplicationStatusBadge, Card, CardContent } from "@/components/ui";

interface ApplicantCardProps {
  application: Application;
}

export function ApplicantCard({ application }: ApplicantCardProps) {
  return (
    <Card padding="sm" hoverable>
      <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={application.representative_photo_path}
            alt={`${application.name} 대표사진`}
            className="h-12 w-12 shrink-0 rounded-full object-cover border border-neutral-200"
          />
          <div className="min-w-0 grid gap-1 sm:grid-cols-2 lg:grid-cols-3 flex-1">
            <div>
              <p className="text-body-sm font-semibold text-neutral-800">
                {application.name}
              </p>
              <p className="text-caption text-neutral-500">
                {application.age}세 ·{" "}
                {getGenderConditionLabel(application.gender)}
              </p>
            </div>
            <div>
              <p className="text-caption text-neutral-400">입도 가능일</p>
              <p className="text-body-sm text-neutral-700">
                {formatDate(application.available_start_date)}
              </p>
            </div>
            <div>
              <p className="text-caption text-neutral-400">가능 근무 기간</p>
              <p className="text-body-sm text-neutral-700">
                {application.available_work_period}
              </p>
            </div>
            <div>
              <p className="text-caption text-neutral-400">경험</p>
              <p className="text-body-sm text-neutral-700">
                {getExperienceStatusLabel(application.experience_status)}
              </p>
            </div>
            <div>
              <p className="text-caption text-neutral-400">지원일</p>
              <p className="text-body-sm text-neutral-700">
                {formatDate(application.created_at)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <ApplicationStatusBadge status={application.status} />
          <Link
            href={`/owner/applications/${application.id}`}
            className="inline-flex h-9 items-center rounded-md border border-neutral-200 bg-neutral-0 px-4 text-body-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-ring"
          >
            상세 보기
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

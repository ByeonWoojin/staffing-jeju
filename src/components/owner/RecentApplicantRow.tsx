import type { Application } from "@/types/database";
import Link from "next/link";
import { isNewApplicationStatus } from "@/lib/application-status";
import { formatDate } from "@/lib/owner-utils";
import { getGenderConditionLabel } from "@/lib/labels";
import {
  ApplicationStatusBadge,
  Badge,
  Card,
  CardContent,
} from "@/components/ui";

interface RecentApplicantRowProps {
  application: Application & { representativePhotoUrl?: string | null };
  showNewBadge?: boolean;
}

export function RecentApplicantRow({
  application,
  showNewBadge = false,
}: RecentApplicantRowProps) {
  const photoSrc =
    application.representativePhotoUrl ?? application.representative_photo_path;
  const isNewApplication =
    showNewBadge && isNewApplicationStatus(application.status);

  return (
    <Card padding="sm" hoverable>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoSrc}
            alt={`${application.name} 대표사진`}
            className="h-10 w-10 shrink-0 rounded-full object-cover border border-neutral-200"
          />
          <div className="min-w-0">
            <p className="text-body-sm font-semibold text-neutral-800 truncate">
              <span className="inline-flex max-w-full items-center gap-1.5">
                <span className="truncate">{application.name}</span>
                {isNewApplication && (
                  <Badge
                    variant="primary"
                    className="h-5 px-2 text-[11px]"
                    aria-label="신규 지원자"
                  >
                    신규
                  </Badge>
                )}
              </span>{" "}
              <span className="font-normal text-neutral-500">
                · {application.age}세 ·{" "}
                {getGenderConditionLabel(application.gender)}
              </span>
            </p>
            <p className="text-caption text-neutral-400">
              지원일 {formatDate(application.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <ApplicationStatusBadge status={application.status} />
          <Link
            href={`/owner/applications/${application.id}`}
            className="text-body-sm font-semibold text-primary-700 hover:text-primary-600 focus-ring rounded-md px-2 py-1"
          >
            상세 보기
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function RecentApplicantList({
  applications,
  showNewBadge = false,
}: {
  applications: (Application & { representativePhotoUrl?: string | null })[];
  showNewBadge?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {applications.map((application) => (
        <RecentApplicantRow
          key={application.id}
          application={application}
          showNewBadge={showNewBadge}
        />
      ))}
    </div>
  );
}

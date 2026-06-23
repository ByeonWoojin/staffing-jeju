"use client";

import { useMemo, useState } from "react";
import type { Application, ApplicationStatus } from "@/types/database";
import { APPLICATION_STATUS_LABELS } from "@/lib/labels";
import { ApplicantCard } from "@/components/owner/ApplicantCard";
import { cn } from "@/lib/cn";

const FILTER_OPTIONS: { value: "all" | ApplicationStatus; label: string }[] = [
  { value: "all", label: "전체" },
  ...(
    Object.entries(APPLICATION_STATUS_LABELS) as [ApplicationStatus, string][]
  ).map(([value, label]) => ({ value, label })),
];

interface ApplicantListProps {
  applications: Application[];
}

export function ApplicantList({ applications }: ApplicantListProps) {
  const [filter, setFilter] = useState<"all" | ApplicationStatus>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return applications;
    return applications.filter((a) => a.status === filter);
  }, [applications, filter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={cn(
              "shrink-0 rounded-pill px-3 py-1.5 text-caption font-semibold transition-colors focus-ring",
              filter === option.value
                ? "bg-primary-50 text-primary-700"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-body-sm text-neutral-500">
          해당 상태의 지원자가 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((application) => (
            <ApplicantCard key={application.id} application={application} />
          ))}
        </div>
      )}
    </div>
  );
}

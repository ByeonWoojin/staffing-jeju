"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { PublicJobFilters } from "@/lib/public-job-data";
import { GENDER_CONDITION_LABELS, JEJU_REGION_OPTIONS } from "@/lib/labels";
import { Button, Select } from "@/components/ui";

const startOptions = [
  { value: "", label: "입도일 전체" },
  { value: "7", label: "1주 이내" },
  { value: "14", label: "2주 이내" },
  { value: "30", label: "1개월 이내" },
];

function countAppliedFilters(filters: PublicJobFilters) {
  return [
    filters.region,
    filters.start,
    filters.gender,
    filters.party,
    filters.paid,
    filters.accommodation,
    filters.meal,
    filters.urgent,
  ].filter(Boolean).length;
}

function FilterSelect({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue: string;
  children: ReactNode;
}) {
  return (
    <label className="min-w-[9rem] flex-1">
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-pill border border-neutral-200 bg-neutral-0 px-4 text-body-sm font-semibold text-neutral-700 outline-none transition-colors hover:border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
      >
        {children}
      </select>
    </label>
  );
}

function BooleanSelect({
  label,
  name,
  defaultValue,
  trueLabel,
  falseLabel,
}: {
  label: string;
  name: string;
  defaultValue: string;
  trueLabel: string;
  falseLabel: string;
}) {
  return (
    <FilterSelect label={label} name={name} defaultValue={defaultValue}>
      <option value="">{label} 전체</option>
      <option value="true">{trueLabel}</option>
      <option value="false">{falseLabel}</option>
    </FilterSelect>
  );
}

export function JobsFilterBar({ filters }: { filters: PublicJobFilters }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const appliedFilterCount = useMemo(() => countAppliedFilters(filters), [filters]);

  return (
    <form className="rounded-xl border border-neutral-200 bg-neutral-0 p-3 shadow-sm md:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <label htmlFor="jobs-keyword" className="sr-only">
            키워드 검색
          </label>
          <input
            id="jobs-keyword"
            name="q"
            defaultValue={filters.q}
            placeholder="게스트하우스명, 지역, 업무 내용"
            className="h-12 w-full rounded-pill border border-neutral-200 bg-neutral-0 px-5 text-body text-neutral-800 placeholder:text-neutral-400 transition-colors duration-150 focus-ring focus:border-primary-500"
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="submit" className="h-12 rounded-pill px-6">
            검색
          </Button>
          <Link
            href="/jobs"
            className="hidden h-12 items-center justify-center rounded-pill border border-neutral-200 px-5 text-body-sm font-semibold text-neutral-700 hover:bg-neutral-50 sm:inline-flex"
          >
            필터 초기화
          </Link>
        </div>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <FilterSelect label="지역" name="region" defaultValue={filters.region}>
          <option value="">지역 전체</option>
          {JEJU_REGION_OPTIONS.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="입도일" name="start" defaultValue={filters.start}>
          {startOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FilterSelect>
        <BooleanSelect
          label="숙소"
          name="accommodation"
          defaultValue={filters.accommodation}
          trueLabel="숙소 제공"
          falseLabel="숙소 미제공"
        />
        <BooleanSelect
          label="식사"
          name="meal"
          defaultValue={filters.meal}
          trueLabel="식사 제공"
          falseLabel="식사 미제공"
        />
        <label className="inline-flex h-10 shrink-0 items-center gap-2 rounded-pill border border-neutral-200 bg-neutral-0 px-4 text-body-sm font-semibold text-neutral-700 hover:border-neutral-300">
          <input
            type="checkbox"
            name="urgent"
            value="true"
            defaultChecked={filters.urgent === "true"}
            className="h-4 w-4 rounded border-neutral-300"
          />
          급구
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-pill px-4"
          onClick={() => setIsExpanded((value) => !value)}
        >
          {isExpanded ? "필터 접기" : "필터 더보기"}
          {!isExpanded && appliedFilterCount > 0 ? ` · ${appliedFilterCount}개 적용` : ""}
        </Button>
        <Link
          href="/jobs"
          className="inline-flex h-9 items-center justify-center rounded-pill px-4 text-body-sm font-semibold text-neutral-500 hover:bg-neutral-100 sm:hidden"
        >
          필터 초기화
        </Link>
      </div>

      {isExpanded && (
        <div className="mt-3 grid gap-3 border-t border-neutral-100 pt-3 md:grid-cols-3">
          <Select label="성별 조건" name="gender" defaultValue={filters.gender}>
            <option value="">전체</option>
            {Object.entries(GENDER_CONDITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select label="파티 여부" name="party" defaultValue={filters.party}>
            <option value="">전체</option>
            <option value="true">파티 있음</option>
            <option value="false">파티 없음</option>
          </Select>
          <Select label="급여/보상" name="paid" defaultValue={filters.paid}>
            <option value="">전체</option>
            <option value="true">급여/보상 있음</option>
            <option value="false">급여 없음</option>
          </Select>
        </div>
      )}
    </form>
  );
}

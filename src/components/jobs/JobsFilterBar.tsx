"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { PublicJobFilters } from "@/lib/public-job-data";
import { JEJU_REGION_OPTIONS } from "@/lib/labels";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { COACHMARK_TARGETS } from "@/lib/onboarding/coachmark-config";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui";

const regionOptions = [
  { value: "", label: "제주 전체" },
  ...JEJU_REGION_OPTIONS.map((region) => ({ value: region, label: region })),
] as const;

const recommendedRegions = [
  "제주시",
  "애월",
  "한림",
  "조천",
  "구좌",
  "성산",
  "서귀포시",
  "중문",
] as const;

const quickDateOptions = [
  { value: "", label: "언제든지", days: null },
  { value: "7", label: "1주 이내", days: 7 },
  { value: "14", label: "2주 이내", days: 14 },
  { value: "30", label: "1개월 이내", days: 30 },
] as const;

const conditionOptions = [
  { key: "accommodation", label: "숙소 제공" },
  { key: "meal", label: "식사 제공" },
  { key: "paid", label: "급여 있음" },
  { key: "urgent", label: "급구" },
  { key: "party", label: "파티 있음" },
] as const;

type ConditionKey = (typeof conditionOptions)[number]["key"];
type ConditionState = Record<ConditionKey, boolean>;
type ActiveSection = "region" | "date" | "conditions";

function createConditionState(filters: PublicJobFilters): ConditionState {
  return {
    accommodation: filters.accommodation === "true",
    meal: filters.meal === "true",
    paid: filters.paid === "true",
    urgent: filters.urgent === "true",
    party: filters.party === "true",
  };
}

function getRegionLabel(region: string) {
  return regionOptions.find((option) => option.value === region)?.label ?? "제주 전체";
}

function getLegacyStartLabel(start: string) {
  return quickDateOptions.find((option) => option.value === start)?.label ?? "언제든지";
}

function getConditionSummary(conditions: ConditionState) {
  const labels = conditionOptions
    .filter((option) => conditions[option.key])
    .map((option) => option.label);

  if (labels.length === 0) return "조건 선택";
  if (labels.length === 1) return labels[0];
  return `${labels[0]} 외 ${labels.length - 1}개`;
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function formatShortDate(dateText: string) {
  const [, month, day] = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
  if (!month || !day) return dateText;

  return `${Number(month)}/${Number(day)}`;
}

function getDateRangeLabel(filters: PublicJobFilters) {
  if (filters.arrivalStart && filters.arrivalEnd) {
    return `${formatShortDate(filters.arrivalStart)} ~ ${formatShortDate(
      filters.arrivalEnd,
    )}`;
  }

  if (filters.arrivalStart) return `${formatShortDate(filters.arrivalStart)} 이후`;
  if (filters.arrivalEnd) return `${formatShortDate(filters.arrivalEnd)}까지`;

  return getLegacyStartLabel(filters.start);
}

function getQuickRange(days: number) {
  const today = new Date();

  return {
    start: formatInputDate(today),
    end: formatInputDate(addDays(today, days)),
  };
}

function SearchSegment({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-0 rounded-pill px-5 py-2 text-left transition-colors hover:bg-neutral-50 focus-ring",
        active && "bg-primary-50",
      )}
    >
      <span className="block text-[11px] font-bold leading-4 text-neutral-900">
        {label}
      </span>
      <span className="block truncate text-body-sm font-semibold text-neutral-500">
        {value}
      </span>
    </button>
  );
}

function ChoiceButton({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "h-9 rounded-pill border px-3 text-caption font-semibold transition-colors focus-ring",
        selected
          ? "border-primary-500 bg-primary-50 text-primary-700"
          : "border-neutral-200 bg-neutral-0 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50",
      )}
    >
      {children}
    </button>
  );
}

function DateField({
  id,
  label,
  value,
  min,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  min?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-caption font-bold text-neutral-700">{label}</span>
      <input
        id={id}
        type="date"
        name={value ? id : undefined}
        value={value}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-md border border-neutral-200 bg-neutral-0 px-3 text-body-sm font-semibold text-neutral-800 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
      />
    </label>
  );
}

function getFilterStateKey(filters: PublicJobFilters) {
  return [
    filters.region,
    filters.arrivalStart,
    filters.arrivalEnd,
    filters.start,
    filters.accommodation,
    filters.meal,
    filters.paid,
    filters.party,
    filters.urgent,
  ].join("|");
}

export function JobsFilterBar({ filters }: { filters: PublicJobFilters }) {
  return <JobsFilterBarState key={getFilterStateKey(filters)} filters={filters} />;
}

function JobsFilterBarState({ filters }: { filters: PublicJobFilters }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>("region");
  const [selectedRegion, setSelectedRegion] = useState(filters.region);
  const [selectedDateStart, setSelectedDateStart] = useState(filters.arrivalStart);
  const [selectedDateEnd, setSelectedDateEnd] = useState(filters.arrivalEnd);
  const [selectedQuickDate, setSelectedQuickDate] = useState(filters.start);
  const [selectedConditions, setSelectedConditions] = useState<ConditionState>(() =>
    createConditionState(filters),
  );

  const currentConditions = useMemo(() => createConditionState(filters), [filters]);
  const regionLabel = getRegionLabel(filters.region);
  const dateRangeLabel = getDateRangeLabel(filters);
  const conditionSummary = getConditionSummary(currentConditions);

  useEffect(() => {
    if (!isPanelOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isPanelOpen]);

  const openPanel = (section: ActiveSection) => {
    setActiveSection(section);
    setIsPanelOpen(true);
  };

  const closePanel = () => setIsPanelOpen(false);

  const toggleCondition = (key: ConditionKey) => {
    setSelectedConditions((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const selectQuickDate = (value: string, days: number | null) => {
    setSelectedQuickDate(value);

    if (days === null) {
      setSelectedDateStart("");
      setSelectedDateEnd("");
      return;
    }

    const range = getQuickRange(days);
    setSelectedDateStart(range.start);
    setSelectedDateEnd(range.end);
  };

  const handleDateStartChange = (value: string) => {
    setSelectedQuickDate("");
    setSelectedDateStart(value);
    setSelectedDateEnd((current) =>
      current && value && current < value ? value : current,
    );
  };

  const handleDateEndChange = (value: string) => {
    setSelectedQuickDate("");
    setSelectedDateEnd(value);
  };

  const handleFilterSubmit = () => {
    const hasRegionFilter = Boolean(selectedRegion);
    const hasEntryDateFilter = Boolean(
      selectedQuickDate || selectedDateStart || selectedDateEnd,
    );
    const hasWorkConditionFilter = Object.values(selectedConditions).some(Boolean);
    const filterCount = [
      hasRegionFilter,
      hasEntryDateFilter,
      hasWorkConditionFilter,
    ].filter(Boolean).length;

    trackEvent(ANALYTICS_EVENTS.JOB_FILTER_APPLY, {
      filter_count: filterCount,
      has_region_filter: hasRegionFilter,
      has_entry_date_filter: hasEntryDateFilter,
      has_work_condition_filter: hasWorkConditionFilter,
    });
  };

  const sectionClassName = (section: ActiveSection) =>
    cn(
      "rounded-lg border p-4 transition-colors",
      activeSection === section
        ? "border-primary-200 bg-primary-50/45"
        : "border-neutral-100 bg-neutral-0",
    );

  return (
    <>
      <section
        className="sticky top-0 z-30 border-b border-neutral-100/70 bg-neutral-0/95 backdrop-blur"
        data-coachmark={COACHMARK_TARGETS.staffJobFilter}
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-2.5 md:px-6">
          <div className="mx-auto w-full max-w-3xl">
            <button
              type="button"
              onClick={() => openPanel("region")}
              className="flex h-11 w-full items-center justify-between gap-3 rounded-pill border border-neutral-200 bg-neutral-0 pl-5 pr-2 text-left shadow-sm transition-colors hover:border-neutral-300 focus-ring md:hidden"
            >
              <span className="min-w-0">
                <span className="block truncate text-body-sm font-bold text-neutral-900">
                  {regionLabel} · {dateRangeLabel}
                </span>
                <span className="block truncate text-caption font-semibold text-neutral-500">
                  {conditionSummary}
                </span>
              </span>
              <span className="inline-flex h-9 shrink-0 items-center justify-center rounded-pill bg-primary-500 px-4 text-body-sm font-bold! text-white!">
                검색
              </span>
            </button>

            <div className="hidden min-h-[52px] overflow-hidden rounded-pill border border-neutral-200 bg-neutral-0 shadow-sm md:grid md:grid-cols-[1fr_auto_1.15fr_auto_1.15fr_auto] md:items-center">
              <SearchSegment
                label="지역"
                value={regionLabel}
                active={activeSection === "region" && isPanelOpen}
                onClick={() => openPanel("region")}
              />
              <div className="h-7 w-px bg-neutral-200" />
              <SearchSegment
                label="입도 가능일"
                value={dateRangeLabel}
                active={activeSection === "date" && isPanelOpen}
                onClick={() => openPanel("date")}
              />
              <div className="h-7 w-px bg-neutral-200" />
              <SearchSegment
                label="조건"
                value={conditionSummary}
                active={activeSection === "conditions" && isPanelOpen}
                onClick={() => openPanel("conditions")}
              />
              <button
                type="button"
                onClick={() => openPanel("conditions")}
                className="mr-2 inline-flex h-10 shrink-0 items-center justify-center rounded-pill bg-primary-500 px-5 text-body-sm font-bold! text-white! transition-colors hover:bg-primary-600 focus-ring"
              >
                검색
              </button>
            </div>
          </div>
        </div>
      </section>

      {isPanelOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="검색 패널 닫기"
            onClick={closePanel}
            className="absolute inset-0 h-full w-full bg-neutral-900/25 backdrop-blur-[1px]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="jobs-filter-title"
            className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-lg border border-neutral-200 bg-neutral-0 shadow-lg md:bottom-auto md:left-1/2 md:top-24 md:w-[calc(100vw-32px)] md:max-w-[720px] md:-translate-x-1/2 md:rounded-lg"
          >
            <form
              action="/jobs"
              method="get"
              className="flex flex-col"
              onSubmit={handleFilterSubmit}
            >
              {selectedRegion && (
                <input type="hidden" name="region" value={selectedRegion} />
              )}
              {selectedQuickDate && !selectedDateStart && !selectedDateEnd && (
                <input type="hidden" name="start" value={selectedQuickDate} />
              )}
              {conditionOptions.map((option) =>
                selectedConditions[option.key] ? (
                  <input
                    key={option.key}
                    type="hidden"
                    name={option.key}
                    value="true"
                  />
                ) : null,
              )}

              <div className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-4 md:px-6">
                <div>
                  <p className="text-caption font-semibold text-primary-700">
                    제주 스탭 공고 찾기
                  </p>
                  <h2 id="jobs-filter-title" className="text-title text-neutral-900">
                    원하는 조건을 골라보세요
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closePanel}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-body-sm font-bold text-neutral-600 transition-colors hover:bg-neutral-50 focus-ring"
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>

              <div className="grid gap-4 px-5 py-5 md:px-6 md:py-6">
                <section className={sectionClassName("region")}>
                  <h3 className="text-body-sm font-bold text-neutral-900">추천 지역</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ChoiceButton
                      selected={selectedRegion === ""}
                      onClick={() => setSelectedRegion("")}
                    >
                      제주 전체
                    </ChoiceButton>
                    {recommendedRegions.map((region) => (
                      <ChoiceButton
                        key={region}
                        selected={selectedRegion === region}
                        onClick={() => setSelectedRegion(region)}
                      >
                        {region}
                      </ChoiceButton>
                    ))}
                  </div>
                </section>

                <section className={sectionClassName("date")}>
                  <h3 className="text-body-sm font-bold text-neutral-900">
                    입도 가능일
                  </h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <DateField
                      id="arrivalStart"
                      label="시작일 선택"
                      value={selectedDateStart}
                      onChange={handleDateStartChange}
                    />
                    <DateField
                      id="arrivalEnd"
                      label="종료일 선택"
                      value={selectedDateEnd}
                      min={selectedDateStart || undefined}
                      onChange={handleDateEndChange}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickDateOptions.map((option) => (
                      <ChoiceButton
                        key={option.value || "any"}
                        selected={
                          option.value === ""
                            ? !selectedQuickDate &&
                              !selectedDateStart &&
                              !selectedDateEnd
                            : selectedQuickDate === option.value
                        }
                        onClick={() => selectQuickDate(option.value, option.days)}
                      >
                        {option.label}
                      </ChoiceButton>
                    ))}
                  </div>
                </section>

                <section className={sectionClassName("conditions")}>
                  <h3 className="text-body-sm font-bold text-neutral-900">추천 조건</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {conditionOptions.map((option) => (
                      <ChoiceButton
                        key={option.key}
                        selected={selectedConditions[option.key]}
                        onClick={() => toggleCondition(option.key)}
                      >
                        {option.label}
                      </ChoiceButton>
                    ))}
                  </div>
                </section>
              </div>

              <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-neutral-100 bg-neutral-0 px-5 py-4 md:px-6">
                <Link
                  href="/jobs"
                  className="inline-flex h-11 items-center justify-center rounded-md px-4 text-body-sm font-bold text-neutral-600 transition-colors hover:bg-neutral-100 focus-ring"
                >
                  초기화
                </Link>
                <Button type="submit" className="h-11 rounded-md px-7">
                  검색하기
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const ASAP_WORK_START_DATE = "9999-12-31";

export const WORK_START_DATE_PAST_ERROR_MESSAGE =
  "근무 시작일은 오늘 이후 날짜로 선택해 주세요.";

export const WORK_START_DATE_INVALID_ERROR_MESSAGE =
  "근무 시작일을 올바른 날짜로 선택해 주세요.";

export const WORK_START_DATE_REOPEN_PAST_ERROR_MESSAGE =
  "근무 시작일이 지난 모집글입니다. 근무 시작일을 수정한 뒤 다시 모집해 주세요.";

export function getTodayDateStringInKorea(referenceDate = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(referenceDate);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("한국 시간 기준 오늘 날짜를 계산할 수 없습니다.");
  }

  return `${year}-${month}-${day}`;
}

export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isPastDateInKorea(
  dateString: string,
  todayInKorea = getTodayDateStringInKorea(),
): boolean {
  if (isAsapWorkStartDate(dateString)) return false;
  if (!isValidDateString(dateString)) return false;
  return dateString < todayInKorea;
}

export function isAsapWorkStartDate(dateString: string): boolean {
  return dateString.trim() === ASAP_WORK_START_DATE;
}

export function resolveWorkStartDateInputValue(dateString: string): string {
  return isAsapWorkStartDate(dateString)
    ? getTodayDateStringInKorea()
    : dateString;
}

export function normalizeRequiredDateString(
  value: string,
  fieldLabel: string,
): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldLabel}은(는) 필수 입력값입니다.`);
  }
  if (!isValidDateString(trimmed)) {
    throw new Error(WORK_START_DATE_INVALID_ERROR_MESSAGE);
  }
  return trimmed;
}

export function normalizeNewWorkStartDate(value: string): string {
  const normalized = normalizeRequiredDateString(value, "근무 시작일");
  if (isPastDateInKorea(normalized)) {
    throw new Error(WORK_START_DATE_PAST_ERROR_MESSAGE);
  }
  return normalized;
}

export function normalizeUpdatedWorkStartDate(
  value: string,
  currentWorkStartDate: string,
): string {
  const normalized = normalizeRequiredDateString(value, "근무 시작일");
  const current = currentWorkStartDate.trim();

  if (normalized === current) {
    return normalized;
  }
  if (isPastDateInKorea(normalized)) {
    throw new Error(WORK_START_DATE_PAST_ERROR_MESSAGE);
  }
  return normalized;
}

export function getWorkStartDateFieldError(
  value: string,
  options: {
    currentWorkStartDate?: string | null;
    isAsap?: boolean;
    todayInKorea?: string;
  } = {},
): string | null {
  if (options.isAsap) return null;

  const normalized = value.trim();
  if (!normalized) {
    return "근무 시작일은(는) 필수 입력값입니다.";
  }
  if (!isValidDateString(normalized)) {
    return WORK_START_DATE_INVALID_ERROR_MESSAGE;
  }
  if (normalized === options.currentWorkStartDate?.trim()) {
    return null;
  }
  if (isPastDateInKorea(normalized, options.todayInKorea)) {
    return WORK_START_DATE_PAST_ERROR_MESSAGE;
  }
  return null;
}

export function isWorkStartDateErrorMessage(message: string): boolean {
  return (
    message === WORK_START_DATE_PAST_ERROR_MESSAGE ||
    message === WORK_START_DATE_INVALID_ERROR_MESSAGE ||
    message.startsWith("근무 시작일은(는)")
  );
}

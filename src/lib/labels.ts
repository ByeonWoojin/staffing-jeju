export const JOB_STATUS_LABELS = {
  open: "모집중",
  closed: "모집 마감",
  hidden: "숨김",
} as const;

export const APPLICATION_STATUS_LABELS = {
  submitted: "지원 완료",
  viewed: "사장님 열람",
  accepted: "채용합격",
  rejected: "불합격",
  canceled: "지원취소",
} as const;

export const GENDER_CONDITION_LABELS = {
  any: "성별 무관",
  male: "남성",
  female: "여성",
} as const;

export const EXPERIENCE_STATUS_LABELS = {
  none: "경험 없음",
  experienced: "경험 있음",
} as const;

export const STIPEND_TYPE_LABELS = {
  none: "급여 없음",
  provided: "급여/보상 제공",
  negotiable: "협의 후 결정",
  custom: "직접 입력",
} as const;

export const JEJU_REGION_OPTIONS = [
  "제주시",
  "서귀포시",
  "애월",
  "한림",
  "조천",
  "구좌",
  "성산",
  "표선",
  "남원",
  "중문",
  "대정",
  "기타",
] as const;

export type JobStatus = keyof typeof JOB_STATUS_LABELS;
export type ApplicationStatus = keyof typeof APPLICATION_STATUS_LABELS;
export type GenderCondition = keyof typeof GENDER_CONDITION_LABELS;
export type ExperienceStatus = keyof typeof EXPERIENCE_STATUS_LABELS;
export type StipendType = keyof typeof STIPEND_TYPE_LABELS;

export function getJobStatusLabel(status: JobStatus): string {
  return JOB_STATUS_LABELS[status];
}

export function getApplicationStatusLabel(status: ApplicationStatus): string {
  return APPLICATION_STATUS_LABELS[status];
}

export function getGenderConditionLabel(condition: GenderCondition): string {
  return GENDER_CONDITION_LABELS[condition];
}

export function getExperienceStatusLabel(status: ExperienceStatus): string {
  return EXPERIENCE_STATUS_LABELS[status];
}

export function getStipendTypeLabel(type: StipendType): string {
  return STIPEND_TYPE_LABELS[type];
}

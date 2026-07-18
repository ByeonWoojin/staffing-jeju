import type { UserRole } from "@/types/database";

export const COACHMARK_TARGETS = {
  ownerGuesthouseForm: "owner-guesthouse-form",
  ownerJobPostForm: "owner-job-post-form",
  ownerApplications: "owner-applications",
  staffJobFilter: "staff-job-filter",
  staffJobCard: "staff-job-card",
  staffApply: "staff-apply",
} as const;

export type CoachmarkTarget =
  (typeof COACHMARK_TARGETS)[keyof typeof COACHMARK_TARGETS];

export type CoachmarkRole = Extract<UserRole, "owner" | "staff">;

export type CoachmarkStep = {
  id: string;
  role: CoachmarkRole;
  target: CoachmarkTarget;
  route: string;
  title: string;
  description: string;
  primaryLabel: string;
};

export const coachmarkSteps = [
  {
    id: "owner-guesthouse",
    role: "owner",
    target: COACHMARK_TARGETS.ownerGuesthouseForm,
    route: "/onboarding/owner/guesthouse",
    title: "게스트하우스 정보를 등록해 주세요",
    description:
      "스탭 모집을 시작하려면 먼저 게스트하우스의 기본 정보와 사진을 등록해야 해요.",
    primaryLabel: "확인했어요",
  },
  {
    id: "owner-job-post",
    role: "owner",
    target: COACHMARK_TARGETS.ownerJobPostForm,
    route: "/onboarding/owner/job-post",
    title: "스탭 모집 조건을 작성해 주세요",
    description:
      "근무 일정, 주요 업무와 제공 조건을 입력하면 스탭이 확인할 모집글이 완성돼요.",
    primaryLabel: "확인했어요",
  },
  {
    id: "owner-applications",
    role: "owner",
    target: COACHMARK_TARGETS.ownerApplications,
    route: "/owner",
    title: "지원자는 여기서 확인할 수 있어요",
    description:
      "지원서가 접수되면 지원자 정보를 확인하고 열람, 합격, 불합격 상태를 관리할 수 있어요.",
    primaryLabel: "시작하기",
  },
  {
    id: "staff-job-filter",
    role: "staff",
    target: COACHMARK_TARGETS.staffJobFilter,
    route: "/jobs",
    title: "원하는 조건으로 모집글을 찾아보세요",
    description:
      "제주 지역, 입도 가능일과 근무 조건을 선택해 나에게 맞는 모집글을 찾을 수 있어요.",
    primaryLabel: "다음",
  },
  {
    id: "staff-job-card",
    role: "staff",
    target: COACHMARK_TARGETS.staffJobCard,
    route: "/jobs",
    title: "모집 조건을 자세히 확인해 보세요",
    description:
      "모집글을 선택하면 근무 일정, 업무 내용과 게스트하우스 정보를 확인할 수 있어요.",
    primaryLabel: "확인했어요",
  },
  {
    id: "staff-apply",
    role: "staff",
    target: COACHMARK_TARGETS.staffApply,
    route: "/jobs/[slug]",
    title: "마음에 드는 모집글에 지원해 보세요",
    description:
      "근무 조건을 확인한 뒤 지원서를 작성하면 지원 현황에서 진행 상태를 확인할 수 있어요.",
    primaryLabel: "시작하기",
  },
] satisfies CoachmarkStep[];

export function getCoachmarkSteps(role: CoachmarkRole) {
  return coachmarkSteps.filter((step) => step.role === role);
}

export function matchesCoachmarkRoute(route: string, pathname: string) {
  if (route === pathname) return true;
  if (!route.includes("[slug]")) return false;

  const routeParts = route.split("/");
  const pathParts = pathname.split("/");
  if (routeParts.length !== pathParts.length) return false;

  return routeParts.every((part, index) => {
    if (part === "[slug]") return Boolean(pathParts[index]);
    return part === pathParts[index];
  });
}

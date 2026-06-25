import {
  currentOwner,
  mockApplications,
  mockGuesthouses,
  mockJobPosts,
  SHARE_LINK_BASE_URL,
} from "@/mocks/owner-mock-data";
import type {
  Application,
  ApplicationStatus,
  Guesthouse,
  JobPost,
  JobPostFormData,
  Profile,
} from "@/types/database";

export { currentOwner, SHARE_LINK_BASE_URL };

//TODO: Supabase Auth에서 현재 로그인된 owner 사용자 조회

export function getCurrentOwnerMock(): Profile {
  return currentOwner;
}

//TODO: GET guesthouses where owner_id = currentOwner.id

export function getOwnerGuesthousesMock(ownerId: string): Guesthouse[] {
  return mockGuesthouses.filter((g) => g.owner_id === ownerId);
}

export function getOwnerGuesthouseMock(ownerId: string): Guesthouse | null {
  return getOwnerGuesthousesMock(ownerId)[0] ?? null;
}

//TODO: GET job_posts where owner_id = currentOwner.id (MVP: guesthouse당 1개)

export function getOwnerJobPostsMock(ownerId: string): JobPost[] {
  return mockJobPosts.filter((j) => j.owner_id === ownerId);
}

/** MVP: 현재 운영 중인 단일 스탭 모집글 */
export function getCurrentJobPostMock(ownerId: string): JobPost | null {
  const guesthouse = getOwnerGuesthouseMock(ownerId);
  if (!guesthouse) return null;

  return (
    mockJobPosts.find(
      (j) => j.owner_id === ownerId && j.guesthouse_id === guesthouse.id,
    ) ?? null
  );
}

//TODO: GET job_posts by id where owner_id = currentOwner.id

export function getOwnerJobPostByIdMock(
  ownerId: string,
  jobPostId: string,
): JobPost | null {
  return (
    mockJobPosts.find(
      (j) => j.id === jobPostId && j.owner_id === ownerId,
    ) ?? null
  );
}

//TODO: GET applications joined with job_posts where job_posts.owner_id = currentOwner.id

export function getOwnerApplicationsMock(ownerId: string): Application[] {
  const currentJobPost = getCurrentJobPostMock(ownerId);
  if (!currentJobPost) return [];

  return getApplicationsByJobPostIdMock(currentJobPost.id);
}

//TODO: GET applications where job_post_id = currentJobPost.id

export function getApplicationsByJobPostIdMock(
  jobPostId: string,
): Application[] {
  return mockApplications
    .filter((a) => a.job_post_id === jobPostId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

//TODO: GET applications count grouped by job_post_id

export function getApplicationCountByJobPostMock(
  jobPostId: string,
): number {
  return mockApplications.filter((a) => a.job_post_id === jobPostId).length;
}

//TODO: GET application by id joined with job_posts

export function getApplicationByIdMock(
  applicationId: string,
): Application | null {
  return mockApplications.find((a) => a.id === applicationId) ?? null;
}

export function getApplicationWithOwnerCheckMock(
  ownerId: string,
  applicationId: string,
): { application: Application; job_post: JobPost } | null {
  const application = getApplicationByIdMock(applicationId);
  if (!application) return null;

  const job_post = getOwnerJobPostByIdMock(ownerId, application.job_post_id);
  if (!job_post) return null;

  return { application, job_post };
}

export function getGuesthouseByIdMock(
  guesthouseId: string,
): Guesthouse | null {
  return mockGuesthouses.find((g) => g.id === guesthouseId) ?? null;
}

export interface OwnerDashboardData {
  owner: Profile;
  guesthouse: Guesthouse | null;
  current_job_post: JobPost | null;
  applications: Application[];
  stats: {
    total_application_count: number;
    new_application_count: number;
  };
}

//TODO: GET current owner profile
//TODO: GET guesthouses where owner_id = currentOwner.id
//TODO: GET current job_post for guesthouse
//TODO: GET applications for current job_post

export function getOwnerDashboardDataMock(): OwnerDashboardData {
  const owner = getCurrentOwnerMock();
  const guesthouse = getOwnerGuesthouseMock(owner.id);
  const current_job_post = getCurrentJobPostMock(owner.id);
  const applications = getOwnerApplicationsMock(owner.id);

  const new_application_count = applications.filter(
    (a) => a.status === "submitted",
  ).length;

  return {
    owner,
    guesthouse,
    current_job_post,
    applications,
    stats: {
      total_application_count: applications.length,
      new_application_count,
    },
  };
}

export function getShareLink(slug: string): string {
  //TODO: use real production domain after deployment
  return `${SHARE_LINK_BASE_URL}/${slug}`;
}

export function canBumpJobPost(jobPost: JobPost): boolean {
  return getBumpDisabledReason(jobPost) === null;
}

export function getBumpDisabledReason(jobPost: JobPost): string | null {
  if (jobPost.status !== "open") {
    return "마감된 모집글은 끌어올릴 수 없습니다.";
  }
  if (!jobPost.last_bumped_at) return null;

  const lastBump = new Date(jobPost.last_bumped_at).getTime();
  const hoursSinceBump = (Date.now() - lastBump) / (1000 * 60 * 60);
  if (hoursSinceBump < 24) {
    return "끌어올리기는 24시간에 1회만 가능합니다.";
  }
  return null;
}

export function getRecruitmentStatusMessage(status: JobPost["status"]): string {
  switch (status) {
    case "open":
      return "모집중이면 지원자가 들어올 수 있습니다.";
    case "closed":
      return "마감 상태에서는 지원자가 새로 지원할 수 없습니다.";
    case "hidden":
      return "숨김 상태입니다. 일반 사용자에게 노출되지 않습니다.";
  }
}

export function getAllowedStatusTransitions(
  currentStatus: ApplicationStatus,
): ApplicationStatus[] {
  switch (currentStatus) {
    case "submitted":
      return ["viewed", "accepted", "rejected", "canceled"];
    case "viewed":
      return ["accepted", "rejected", "canceled"];
    default:
      return [];
  }
}

export function generateSlugFromTitle(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base}-${Date.now().toString(36)}`;
}

export function createJobPostFromFormMock(
  ownerId: string,
  guesthouseId: string,
  formData: JobPostFormData,
): JobPost {
  const now = new Date().toISOString();
  return {
    id: `job_post_${Date.now()}`,
    guesthouse_id: guesthouseId,
    owner_id: ownerId,
    slug: generateSlugFromTitle(formData.title),
    status: "open",
    recruitment_cycle: 1,
    bumped_at: now,
    last_bumped_at: null,
    last_urgent_marked_at: null,
    bump_count: 0,
    created_at: now,
    updated_at: now,
    ...formData,
  };
}

export const JOB_POST_LOG_FIELDS = [
  "work_start_date",
  "min_work_period",
  "work_content",
  "work_time",
  "work_days_per_week",
  "off_days_per_week",
  "stipend_type",
  "stipend_description",
  "provides_accommodation",
  "provides_meal",
] as const;

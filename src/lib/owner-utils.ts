export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "방금 전";
  if (diffHours < 24) return `${diffHours}시간 전`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;

  return formatDate(dateString);
}

const SESSION_KEY_CREATED_JOB = "staffing_created_job_post";

export function saveCreatedJobPostToSession(jobPost: unknown): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY_CREATED_JOB, JSON.stringify(jobPost));
}

export function getCreatedJobPostFromSession<T>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY_CREATED_JOB);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearCreatedJobPostFromSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY_CREATED_JOB);
}

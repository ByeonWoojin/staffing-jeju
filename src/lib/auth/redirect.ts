export const AUTH_REDIRECT_PARAM = "redirect";

const INTERNAL_URL_BASE = "https://staffing-jeju.vercel.app";

export function getSafeInternalRedirectPath(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  try {
    const url = new URL(trimmed, INTERNAL_URL_BASE);
    if (url.origin !== INTERNAL_URL_BASE) return null;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function appendAuthEventParams(
  path: string,
  authEvent: "login" | "sign_up",
  userRole: "owner" | "staff",
) {
  const url = new URL(path, INTERNAL_URL_BASE);
  url.searchParams.set("auth_event", authEvent);
  url.searchParams.set("user_role", userRole);

  return `${url.pathname}${url.search}${url.hash}`;
}

export function appendRedirectParam(path: string, redirectPath: string | null) {
  const safeRedirectPath = getSafeInternalRedirectPath(redirectPath);
  if (!safeRedirectPath) return path;

  const url = new URL(path, INTERNAL_URL_BASE);
  url.searchParams.set(AUTH_REDIRECT_PARAM, safeRedirectPath);

  return `${url.pathname}${url.search}${url.hash}`;
}

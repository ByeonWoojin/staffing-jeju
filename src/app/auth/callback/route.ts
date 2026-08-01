import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { getPostLoginDestination, getProfileById } from "@/lib/auth/onboarding";
import {
  appendRedirectParam,
  AUTH_REDIRECT_PARAM,
  getSafeInternalRedirectPath,
} from "@/lib/auth/redirect";

function createAuthErrorRedirect(origin: string) {
  const redirectUrl = new URL("/", origin);
  redirectUrl.searchParams.set("auth_error", "oauth_callback_failed");
  return redirectUrl;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const requestedRedirect = getSafeInternalRedirectPath(
    requestUrl.searchParams.get(AUTH_REDIRECT_PARAM),
  );

  if (!code) {
    return NextResponse.redirect(createAuthErrorRedirect(origin));
  }

  const { supabase, applyCookies } = createSupabaseRouteHandlerClient(request);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchange code failed", {
      message: error.message,
      name: error.name,
    });
    return applyCookies(
      NextResponse.redirect(createAuthErrorRedirect(origin)),
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("[auth/callback] get user failed", {
      message: userError?.message,
      name: userError?.name,
    });
    return applyCookies(
      NextResponse.redirect(createAuthErrorRedirect(origin)),
    );
  }

  let profile: Awaited<ReturnType<typeof getProfileById>>;
  let destination: Awaited<ReturnType<typeof getPostLoginDestination>>;

  try {
    [profile, destination] = await Promise.all([
      getProfileById(user.id),
      getPostLoginDestination(user.id),
    ]);
  } catch (error) {
    console.error("[auth/callback] profile destination lookup failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return applyCookies(
      NextResponse.redirect(createAuthErrorRedirect(origin)),
    );
  }

  const resolvedDestination =
    profile?.role === "staff"
      ? requestedRedirect ?? destination
      : profile?.role === "owner"
        ? destination === "/owner"
          ? requestedRedirect ?? destination
          : appendRedirectParam(destination, requestedRedirect)
        : destination;
  const redirectUrl = new URL(resolvedDestination, origin);

  if (!profile && requestedRedirect && destination === "/onboarding/role") {
    redirectUrl.searchParams.set(AUTH_REDIRECT_PARAM, requestedRedirect);
  }

  if (profile?.role === "staff" || profile?.role === "owner") {
    redirectUrl.searchParams.set("auth_event", "login");
    redirectUrl.searchParams.set("user_role", profile.role);
  }

  return applyCookies(NextResponse.redirect(redirectUrl));
}

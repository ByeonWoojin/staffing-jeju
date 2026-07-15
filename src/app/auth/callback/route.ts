import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseCookieClient } from "@/lib/supabase/server";
import { getPostLoginDestination, getProfileById } from "@/lib/auth/onboarding";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/`);
  }

  const supabase = await createSupabaseCookieClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchange code failed", {
      message: error.message,
      name: error.name,
    });
    return NextResponse.redirect(`${origin}/`);
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
    return NextResponse.redirect(`${origin}/`);
  }

  const [profile, destination] = await Promise.all([
    getProfileById(user.id),
    getPostLoginDestination(user.id),
  ]);
  const redirectUrl = new URL(destination, origin);

  if (profile?.role === "staff" || profile?.role === "owner") {
    redirectUrl.searchParams.set("auth_event", "login");
    redirectUrl.searchParams.set("user_role", profile.role);
  }

  return NextResponse.redirect(redirectUrl);
}

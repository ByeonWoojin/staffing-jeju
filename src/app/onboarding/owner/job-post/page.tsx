import { redirect } from "next/navigation";
import {
  getCurrentAuthUser,
  getPostLoginDestination,
} from "@/lib/auth/onboarding";
import { createOwnerJobPost } from "@/app/onboarding/owner/job-post/actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AnalyticsEventTracker } from "@/components/analytics/AnalyticsEventTracker";
import { JobPostForm } from "@/components/owner";
import { PageHeader } from "@/components/ui";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

export const dynamic = "force-dynamic";

async function getOwnerGuesthouseId(ownerId: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("guesthouses")
    .select("id")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id as string | undefined;
}

export default async function OwnerJobPostOnboardingPage() {
  const user = await getCurrentAuthUser();
  if (!user) {
    redirect("/");
  }

  const destination = await getPostLoginDestination(user.id);
  if (destination !== "/onboarding/owner/job-post") {
    redirect(destination);
  }

  const guesthouseId = await getOwnerGuesthouseId(user.id);

  return (
    <main className="min-h-screen bg-surface">
      {guesthouseId && (
        <AnalyticsEventTracker
          eventName={ANALYTICS_EVENTS.JOB_POST_START}
          properties={{
            guesthouse_id: guesthouseId,
            user_role: "owner",
          }}
        />
      )}
      <div className="page-container py-8 md:py-10">
        <PageHeader
          title="모집글을 먼저 등록해주세요"
          description="우리 게하의 첫 스탭 모집글을 작성합니다."
        />
        <JobPostForm
          mode="create"
          createAction={createOwnerJobPost}
          cancelHref="/onboarding/owner/guesthouse"
          submitLabel="모집글 저장 후 시작하기"
        />
      </div>
    </main>
  );
}

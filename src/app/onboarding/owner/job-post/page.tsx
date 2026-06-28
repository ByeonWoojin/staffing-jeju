import { redirect } from "next/navigation";
import {
  getCurrentAuthUser,
  getPostLoginDestination,
} from "@/lib/auth/onboarding";
import { createOwnerJobPost } from "@/app/onboarding/owner/job-post/actions";
import { JobPostForm } from "@/components/owner";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OwnerJobPostOnboardingPage() {
  const user = await getCurrentAuthUser();
  if (!user) {
    redirect("/");
  }

  const destination = await getPostLoginDestination(user.id);
  if (destination !== "/onboarding/owner/job-post") {
    redirect(destination);
  }

  return (
    <main className="min-h-screen bg-surface px-5 py-8 md:py-10">
      <div className="mx-auto w-full max-w-5xl">
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

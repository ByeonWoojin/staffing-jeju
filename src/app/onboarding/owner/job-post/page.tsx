import { redirect } from "next/navigation";
import {
  getCurrentAuthUser,
  getPostLoginDestination,
} from "@/lib/auth/onboarding";
import { ButtonLink, Card, CardContent } from "@/components/ui";

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
    <main className="flex min-h-screen items-center justify-center bg-surface px-5 py-10">
      <Card className="w-full max-w-lg text-center">
        <CardContent className="pt-6">
          <h1 className="text-h2 text-neutral-800">
            모집글을 먼저 등록해주세요
          </h1>
          <p className="mt-3 text-body-sm text-neutral-500">
            게스트하우스 등록은 확인되었습니다. 다음 단계에서는 최초 모집글
            등록 저장 기능을 연결합니다.
          </p>
          <ButtonLink href="/" variant="outline" className="mt-6">
            첫 화면으로
          </ButtonLink>
        </CardContent>
      </Card>
    </main>
  );
}

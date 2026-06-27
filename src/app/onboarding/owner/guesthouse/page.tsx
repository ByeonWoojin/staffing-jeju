import { redirect } from "next/navigation";
import {
  getCurrentAuthUser,
  getPostLoginDestination,
} from "@/lib/auth/onboarding";
import { ButtonLink, Card, CardContent } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OwnerGuesthouseOnboardingPage() {
  const user = await getCurrentAuthUser();
  if (!user) {
    redirect("/");
  }

  const destination = await getPostLoginDestination(user.id);
  if (destination !== "/onboarding/owner/guesthouse") {
    redirect(destination);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5 py-10">
      <Card className="w-full max-w-lg text-center">
        <CardContent className="pt-6">
          <h1 className="text-h2 text-neutral-800">
            게스트하우스 정보를 먼저 등록해주세요
          </h1>
          <p className="mt-3 text-body-sm text-neutral-500">
            사장님 계정 설정은 완료되었습니다. 다음 단계에서는 게스트하우스
            최초 등록 저장 기능을 연결합니다.
          </p>
          <ButtonLink href="/" variant="outline" className="mt-6">
            첫 화면으로
          </ButtonLink>
        </CardContent>
      </Card>
    </main>
  );
}

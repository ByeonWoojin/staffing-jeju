import { redirect } from "next/navigation";
import {
  getCurrentAuthUser,
  getPostLoginDestination,
} from "@/lib/auth/onboarding";
import { createOwnerGuesthouse } from "@/app/onboarding/owner/guesthouse/actions";
import { GuesthouseForm } from "@/components/owner";
import { PageHeader } from "@/components/ui";

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
    <main className="min-h-screen bg-surface">
      <div className="page-container py-8 md:py-10">
        <PageHeader
          title="게스트하우스 정보를 먼저 등록해주세요"
          description="지원자에게 보여질 게스트하우스 기본 정보를 입력합니다."
        />
        <GuesthouseForm
          mode="create"
          createAction={createOwnerGuesthouse}
          cancelHref="/"
          submitLabel="게스트하우스 저장 후 다음"
        />
      </div>
    </main>
  );
}

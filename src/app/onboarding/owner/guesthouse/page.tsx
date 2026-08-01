import { redirect } from "next/navigation";
import {
  getCurrentAuthUser,
  getPostLoginDestination,
} from "@/lib/auth/onboarding";
import { createOwnerGuesthouse } from "@/app/onboarding/owner/guesthouse/actions";
import {
  appendRedirectParam,
  AUTH_REDIRECT_PARAM,
  getSafeInternalRedirectPath,
} from "@/lib/auth/redirect";
import { RoleCoachmarkController } from "@/components/onboarding/RoleCoachmarkController";
import { GuesthouseForm } from "@/components/owner";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

type OwnerGuesthouseOnboardingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OwnerGuesthouseOnboardingPage({
  searchParams,
}: OwnerGuesthouseOnboardingPageProps) {
  const resolvedSearchParams = await searchParams;
  const redirectPath = getSafeInternalRedirectPath(
    getSearchParamValue(resolvedSearchParams[AUTH_REDIRECT_PARAM]),
  );
  const user = await getCurrentAuthUser();
  if (!user) {
    redirect("/");
  }

  const destination = await getPostLoginDestination(user.id);
  if (destination !== "/onboarding/owner/guesthouse") {
    redirect(
      destination === "/owner" && redirectPath
        ? redirectPath
        : appendRedirectParam(destination, redirectPath),
    );
  }

  async function createOwnerGuesthouseWithRedirect(
    payload: Parameters<typeof createOwnerGuesthouse>[0],
    uploadedPhotoPaths?: Parameters<typeof createOwnerGuesthouse>[1],
  ) {
    "use server";

    return createOwnerGuesthouse(payload, uploadedPhotoPaths, redirectPath);
  }

  return (
    <main className="min-h-screen bg-surface">
      <RoleCoachmarkController role="owner" />
      <div className="page-container py-8 md:py-10">
        <PageHeader
          title="게스트하우스 정보를 먼저 등록해주세요"
          description="지원자에게 보여질 게스트하우스 기본 정보를 입력합니다."
        />
        <GuesthouseForm
          mode="create"
          createAction={createOwnerGuesthouseWithRedirect}
          cancelHref="/"
          submitLabel="게스트하우스 저장 후 다음"
        />
      </div>
    </main>
  );
}

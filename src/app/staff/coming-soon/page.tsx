import { redirect } from "next/navigation";
import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import { ButtonLink, Card, CardContent } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StaffComingSoonPage() {
  const user = await getCurrentAuthUser();
  if (!user) {
    redirect("/");
  }

  const profile = await getProfileById(user.id);
  if (!profile) {
    redirect("/onboarding/role");
  }
  if (profile.role === "owner") {
    redirect("/owner");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5 py-10">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-6">
          <h1 className="text-h2 text-neutral-800">스탭 화면 준비 중</h1>
          <p className="mt-3 text-body-sm text-neutral-500">
            스탭 지원자 화면은 아직 준비 중입니다.
          </p>
          <ButtonLink href="/" variant="outline" className="mt-6">
            첫 화면으로
          </ButtonLink>
        </CardContent>
      </Card>
    </main>
  );
}

import { redirect } from "next/navigation";
import { chooseOwnerRole, chooseStaffRole } from "@/app/onboarding/role/actions";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  getCurrentAuthUser,
  getPostLoginDestination,
} from "@/lib/auth/onboarding";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RoleOnboardingPage() {
  const user = await getCurrentAuthUser();
  if (!user) {
    redirect("/");
  }

  const destination = await getPostLoginDestination(user.id);
  if (destination !== "/onboarding/role") {
    redirect(destination);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mb-5 flex justify-center">
            <BrandLogo className="h-10" priority />
          </div>
          <h1 className="text-h1 text-neutral-800">역할을 선택해주세요</h1>
          <p className="mt-3 text-body text-neutral-500">
            스탭핑에서 사용할 계정 유형을 선택하면 초기 설정을 이어갑니다.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>사장님</CardTitle>
              <CardDescription>
                게스트하우스 정보를 등록하고 스탭 모집글을 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={chooseOwnerRole}>
                <Button type="submit" fullWidth>
                  사장님으로 시작하기
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>스탭</CardTitle>
              <CardDescription>
                게스트하우스 모집글에 지원하는 스탭 계정입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={chooseStaffRole}>
                <Button type="submit" variant="outline" fullWidth>
                  스탭으로 시작하기
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

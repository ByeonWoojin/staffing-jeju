import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { AppHeader } from "@/components/layout/AppHeader";
import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import {
  Badge,
  ButtonLink,
  Card,
  CardContent,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { privatePageMetadata } from "@/lib/seo/private-metadata";

export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata;

const roleLabels = {
  staff: "스탭",
  owner: "사장님",
  admin: "관리자",
} as const;

const staffMenuItems = [
  {
    title: "공고 둘러보기",
    description: "공개 모집글을 찾고 조건에 맞는 게스트하우스를 확인합니다.",
    href: "/jobs",
  },
  {
    title: "관심 게스트하우스",
    description: "저장한 게스트하우스와 현재 모집 중인 공고를 확인합니다.",
    href: "/staff/favorites",
  },
  {
    title: "내 지원 현황",
    description: "제출한 지원서와 지원 상태를 확인합니다.",
    href: "/staff/applications",
  },
] as const;

const ownerMenuItems = [
  {
    title: "사장님 홈",
    description: "우리 게하 스탭 모집 현황을 한눈에 확인합니다.",
    href: "/owner",
  },
  {
    title: "게스트하우스 정보",
    description: "지원자에게 보여질 게스트하우스 정보를 관리합니다.",
    href: "/owner/guesthouse",
  },
  {
    title: "모집글 관리",
    description: "스탭 모집글을 수정하고 모집 상태를 관리합니다.",
    href: "/owner/jobs",
  },
  {
    title: "지원자 관리",
    description: "지원서를 확인하고 채용 상태를 변경합니다.",
    href: "/owner/applications",
  },
] as const;

function LoginRequiredState() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <AppHeader active="profile" />
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <EmptyState
            title="로그인이 필요합니다."
            description="마이페이지는 로그인 후 사용할 수 있습니다."
            action={
              <div className="grid gap-3">
                <GoogleLoginButton ctaLocation="mypage_login_required" />
                <ButtonLink href="/jobs" variant="outline" fullWidth>
                  공고 둘러보기
                </ButtonLink>
              </div>
            }
          />
        </div>
      </div>
    </main>
  );
}

function MenuCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className="group rounded-lg focus-ring">
      <Card className="h-full transition-colors group-hover:border-neutral-300 group-hover:bg-neutral-50">
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-title text-neutral-900">{title}</h2>
              <p className="mt-2 text-body-sm text-neutral-500">{description}</p>
            </div>
            <span className="shrink-0 text-body-sm font-bold text-primary-700">
              이동
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function MyPage() {
  const user = await getCurrentAuthUser();
  if (!user) return <LoginRequiredState />;

  const profile = await getProfileById(user.id);
  if (!profile) redirect("/onboarding/role");

  const menuItems = profile.role === "owner" ? ownerMenuItems : staffMenuItems;
  const email = profile.email ?? user.email ?? "등록된 이메일 없음";

  return (
    <main className="min-h-screen bg-neutral-50">
      <AppHeader active="profile" isAuthenticated />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <PageHeader
          title="마이페이지"
          description="계정 정보와 자주 사용하는 메뉴를 확인할 수 있습니다."
          action={<ButtonLink href="/jobs" variant="outline">공고 둘러보기</ButtonLink>}
        />

        <Card>
          <CardContent className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-h2 text-neutral-900">{profile.name}</h1>
                <Badge variant={profile.role === "owner" ? "sand" : "primary"}>
                  {roleLabels[profile.role]}
                </Badge>
              </div>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-caption font-semibold text-neutral-400">이름</dt>
                  <dd className="mt-1 text-body-sm font-bold text-neutral-800">
                    {profile.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption font-semibold text-neutral-400">이메일</dt>
                  <dd className="mt-1 break-all text-body-sm font-bold text-neutral-800">
                    {email}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption font-semibold text-neutral-400">역할</dt>
                  <dd className="mt-1 text-body-sm font-bold text-neutral-800">
                    {roleLabels[profile.role]}
                  </dd>
                </div>
              </dl>
            </div>
          </CardContent>
        </Card>

        <section>
          <h2 className="text-title text-neutral-900">바로가기</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {menuItems.map((item) => (
              <MenuCard
                key={item.href}
                title={item.title}
                description={item.description}
                href={item.href}
              />
            ))}
          </div>
        </section>

        <Card>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-title text-neutral-900">로그아웃</h2>
              <p className="mt-1 text-body-sm text-neutral-500">
                현재 계정에서 로그아웃하고 공개 공고 목록으로 이동합니다.
              </p>
            </div>
            <LogoutButton
              redirectTo="/"
              variant="outline-danger"
              size="md"
              userRole={profile.role}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

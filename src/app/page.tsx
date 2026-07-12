import { redirect } from "next/navigation";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { getCurrentUserDestination } from "@/lib/auth/onboarding";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { user, destination } = await getCurrentUserDestination();

  if (user && destination !== "/") {
    redirect(destination);
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-surface">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(135deg,var(--color-sand-light)_0%,var(--color-surface)_46%,var(--color-info-light)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[32vh] bg-beige"
        style={{
          clipPath:
            "polygon(0 42%, 12% 34%, 26% 48%, 39% 30%, 53% 45%, 68% 27%, 82% 42%, 100% 31%, 100% 100%, 0 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[20vh] bg-primary-50"
        style={{
          clipPath:
            "polygon(0 55%, 16% 47%, 31% 60%, 46% 43%, 64% 57%, 80% 45%, 100% 54%, 100% 100%, 0 100%)",
        }}
      />

      <div className="page-container relative z-10 flex min-h-screen flex-col py-6 md:py-8">
        <div className="flex items-center">
          <BrandLogo className="h-9 sm:h-10" priority />
        </div>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)] lg:gap-12 lg:py-10">
          <section className="max-w-2xl">
            <div className="mb-6 inline-flex items-center rounded-pill border border-primary-100 bg-neutral-0/80 px-3 py-1.5 text-caption font-semibold text-primary-700 shadow-sm">
              제주 게스트하우스 스탭 모집 서비스
            </div>
            <h1 className="max-w-xl text-h1 text-neutral-900 md:text-display">
              제주에서 머물며 일하는 새로운 방법
            </h1>
            <p className="mt-4 max-w-lg text-body text-neutral-600">
              나에게 맞는 제주 게스트하우스 스탭 모집글을 찾고,
              게스트하우스와 더 자연스럽게 연결해보세요.
            </p>

            <div
              aria-hidden="true"
              className="relative mt-6 h-36 max-w-xl overflow-hidden rounded-lg border border-neutral-100 bg-neutral-0/70 shadow-sm sm:h-52 md:mt-8 md:h-64"
            >
              <div className="absolute inset-x-0 top-0 h-28 bg-info-light" />
              <div
                className="absolute inset-x-0 bottom-12 h-28 bg-sand-light"
                style={{
                  clipPath:
                    "polygon(0 52%, 16% 38%, 33% 56%, 50% 30%, 68% 49%, 84% 34%, 100% 45%, 100% 100%, 0 100%)",
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-beige" />
              <div className="absolute bottom-12 left-10 h-16 w-40 rounded-t-md bg-neutral-0 shadow-sm md:left-16 md:w-48">
                <div
                  className="absolute -top-8 left-0 h-10 w-full bg-primary-500"
                  style={{ clipPath: "polygon(0 100%, 50% 0, 100% 100%)" }}
                />
                <div className="absolute bottom-5 left-6 h-7 w-7 rounded-sm bg-primary-50" />
                <div className="absolute bottom-5 right-8 h-7 w-7 rounded-sm bg-primary-50" />
                <div className="absolute bottom-0 left-1/2 h-10 w-8 -translate-x-1/2 rounded-t-sm bg-brown/20" />
              </div>
              <div className="absolute bottom-10 right-10 h-20 w-16 rounded-t-full bg-sand/35 md:right-16" />
              <div className="absolute bottom-9 right-7 h-24 w-2 rounded-pill bg-brown/40 md:right-12" />
              <div className="absolute bottom-28 right-8 h-10 w-20 rounded-pill bg-primary-100 md:right-14" />
            </div>
          </section>

          <Card className="mx-auto w-full max-w-md bg-neutral-0/95 p-5 shadow-md md:p-6">
            <div className="mb-6">
              <BrandLogo className="mb-4 h-10" priority />
              <h2 className="text-h2 text-neutral-900">스탭핑 시작하기</h2>
              <p className="mt-2 text-body-sm text-neutral-500">
                Google 계정으로 로그인하면 역할에 맞는 화면으로 이동합니다.
              </p>
            </div>

            <GoogleLoginButton />
          </Card>
        </div>
      </div>
    </main>
  );
}

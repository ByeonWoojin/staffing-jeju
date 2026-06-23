import Link from "next/link";
import { ButtonLink } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-5">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-primary-500 text-h2 font-bold text-white">
          S
        </div>
        <h1 className="text-h1 text-neutral-800">스탭핑</h1>
        <p className="mt-3 text-body text-neutral-500">
          제주 게스트하우스 스탭 모집 플랫폼
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <ButtonLink href="/owner" fullWidth className="sm:w-auto">
            사장님 화면
          </ButtonLink>
          <ButtonLink
            href="/design-system"
            variant="outline"
            fullWidth
            className="sm:w-auto"
          >
            디자인 시스템
          </ButtonLink>
        </div>
        <p className="mt-8 text-caption text-neutral-400">
          <Link href="/design-system" className="underline hover:text-neutral-600">
            UI 컴포넌트 미리보기
          </Link>
        </p>
      </div>
    </main>
  );
}

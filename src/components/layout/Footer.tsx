import { BrandLogo } from "@/components/brand/BrandLogo";

const footerContainerClassName = "mx-auto w-full max-w-[1200px] px-5 md:px-8";

export function Footer() {
  return (
    <footer className="bg-[#FFFDF8] py-8 md:py-10">
      <div className={footerContainerClassName}>
        <div className="flex flex-col gap-4 border-t border-primary-100/80 pt-8 text-body-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <BrandLogo className="h-8" />
            <p className="font-semibold text-neutral-700">© 2026 스탭핑</p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <p className="font-medium text-neutral-700">
              제주 게스트하우스와 스탭을 자연스럽게 연결합니다.
            </p>
            <div className="flex flex-col gap-1.5 sm:items-end">
              <p className="font-medium text-neutral-700">문의</p>
              <p className="text-neutral-600">
                궁금한 점은 이메일 또는 인스타그램 DM으로 편하게 문의해
                주세요.
              </p>
              <div className="flex flex-col gap-1.5 sm:items-end">
                <a
                  href="mailto:bwj0721@naver.com"
                  className="font-medium text-neutral-600 transition-colors hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                >
                  이메일: bwj0721@naver.com
                </a>
                <a
                  href="https://www.instagram.com/staffing_jeju/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="스탭핑 인스타그램 새 창에서 열기"
                  className="font-medium text-neutral-600 transition-colors hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                >
                  Instagram: @staffing_jeju
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

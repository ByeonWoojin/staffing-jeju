import Image from "next/image";
import Link from "next/link";
import { HeaderLoginButton } from "@/components/auth/HeaderLoginButton";
import { BrandLogo } from "@/components/brand/BrandLogo";

interface FeatureCard {
  title: string;
  description: string;
  frameSrc: string;
  visualSrc: string;
  visualClassName: string;
  priority?: boolean;
  href?: string;
}

const featureCards: FeatureCard[] = [
  {
    title: "모집글 둘러보기",
    description: "원하는 제주 게스트하우스를 찾아보세요.",
    frameSrc: "/images/landing/card-frame-job.png",
    visualSrc: "/images/landing/card-visual-job.png",
    visualClassName: "w-[78%] max-w-[190px] sm:max-w-[205px] lg:max-w-[190px]",
    priority: true,
    href: "/jobs",
  },
  {
    title: "스탭으로 시작하기",
    description: "제주에서 머물며 일할 곳을 찾아보세요.",
    frameSrc: "/images/landing/card-frame-staff.png",
    visualSrc: "/images/landing/card-visual-staff.png",
    visualClassName: "w-[68%] max-w-[176px] sm:max-w-[190px] lg:max-w-[176px]",
  },
  {
    title: "사장님으로 시작하기",
    description: "우리 게스트하우스와 맞는 스탭을 만나보세요.",
    frameSrc: "/images/landing/card-frame-owner.png",
    visualSrc: "/images/landing/card-visual-owner.png",
    visualClassName: "w-[66%] max-w-[172px] sm:max-w-[184px] lg:max-w-[172px]",
  },
  {
    title: "간편하게 연결하기",
    description: "지원과 모집 관리를 한곳에서 확인해요.",
    frameSrc: "/images/landing/card-frame-connect.png",
    visualSrc: "/images/landing/card-visual-connect.png",
    visualClassName: "w-[62%] max-w-[160px] sm:max-w-[174px] lg:max-w-[162px]",
  },
];

const cardClassName =
  "group relative aspect-[4488/5608] w-[84vw] max-w-[318px] shrink-0 cursor-pointer text-left transition-all duration-200 hover:-translate-y-1 hover:drop-shadow-[0_18px_28px_rgba(31,31,31,0.12)] focus-ring sm:w-full sm:max-w-none";

const landingContainerClassName = "mx-auto w-full max-w-[1200px] px-5 md:px-8";

const headerLoginClassName =
  "h-11 rounded-pill border-primary-500 bg-primary-500 px-5 text-body-sm font-bold text-white! shadow-sm hover:bg-primary-600 disabled:border-primary-300 disabled:bg-primary-300 disabled:text-white!";

const primaryCtaClassName =
  "h-12 rounded-md border-primary-500 bg-primary-500 px-6 text-body font-bold text-white! shadow-sm hover:bg-primary-600 disabled:border-primary-300 disabled:bg-primary-300 disabled:text-white!";

const secondaryCtaClassName =
  "inline-flex h-12 items-center justify-center rounded-md border border-primary-200 bg-neutral-0 px-6 text-body font-bold text-neutral-800 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50 focus-ring";

function LandingHeader() {
  return (
    <header className="flex h-[68px] w-full items-center justify-between gap-3 rounded-pill border border-primary-100/80 bg-neutral-0/90 px-4 shadow-md backdrop-blur sm:h-[72px] sm:px-5 md:px-6">
      <Link
        href="/"
        className="flex shrink-0 items-center rounded-md focus-ring"
        aria-label="스탭핑 홈"
      >
        <BrandLogo className="h-9 sm:h-10" priority />
      </Link>

      <nav
        aria-label="홈 메뉴"
        className="hidden items-center gap-2 text-[15px] font-semibold leading-6 text-neutral-700 md:flex"
      >
        <a
          href="#service"
          className="rounded-md px-3 py-2 transition-colors hover:bg-primary-50 hover:text-primary-600 focus-ring"
        >
          서비스 소개
        </a>
        <Link
          href="/jobs"
          className="rounded-md px-3 py-2 transition-colors hover:bg-primary-50 hover:text-primary-600 focus-ring"
        >
          모집글 둘러보기
        </Link>
        <a
          href="#faq"
          className="rounded-md px-3 py-2 transition-colors hover:bg-primary-50 hover:text-primary-600 focus-ring"
        >
          자주 묻는 질문
        </a>
      </nav>

      <HeaderLoginButton className={headerLoginClassName}>
        Google로 시작하기
      </HeaderLoginButton>
    </header>
  );
}

function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-[#FFFDF8] text-[#1F1F1F]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-28 bg-[#FFF8F1]"
        style={{
          clipPath:
            "polygon(0 64%, 16% 51%, 32% 64%, 49% 48%, 66% 63%, 83% 52%, 100% 61%, 100% 100%, 0 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-28 h-48 w-[min(620px,88vw)] -translate-x-1/2 rounded-[999px] bg-[#FFF3E8] opacity-80 blur-3xl"
      />

      <div className={`${landingContainerClassName} relative z-10 flex min-h-[660px] flex-col gap-8 pb-14 pt-5 sm:min-h-[690px] md:gap-10 md:pb-20 md:pt-6`}>
        <LandingHeader />

        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center text-center">
          <p className="inline-flex rounded-pill border border-primary-100 bg-primary-50 px-3.5 py-1.5 text-[13px] font-bold leading-5 text-primary-600 sm:text-body-sm">
            제주 게스트하우스 스탭 매칭 플랫폼
          </p>
          <h1 className="mt-5 text-[38px] font-bold leading-[1.05] tracking-normal text-[#1F1F1F] sm:text-[48px] md:text-[58px]">
            제주에서 만나는
            <br />
            좋은 공간, 좋은 사람
          </h1>
          <p className="mt-5 max-w-xl text-body font-medium text-neutral-600 sm:text-[18px] sm:leading-7">
            제주 게스트하우스 스탭 모집과 지원을
            <br />한곳에서 편하게 연결해요.
          </p>

          <div className="mt-7 flex w-full max-w-md flex-col items-center justify-center gap-3 sm:max-w-none sm:flex-row">
            <Link
              href="/jobs"
              className={`${secondaryCtaClassName} w-full sm:w-auto`}
            >
              모집글 둘러보기
            </Link>
            <HeaderLoginButton className={`${primaryCtaClassName} w-full sm:w-auto`}>
              Google로 시작하기
            </HeaderLoginButton>
          </div>

          <div className="mt-8 w-[82%] max-w-[330px] sm:mt-9 sm:max-w-[460px] lg:max-w-[580px]">
            <Image
              src="/images/landing/hero-jeju.png"
              alt="제주 오름과 게스트하우스 일러스트"
              width={5792}
              height={4344}
              priority
              sizes="(min-width: 1024px) 580px, (min-width: 640px) 460px, 82vw"
              className="h-auto w-full object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function CardContent({ card }: { card: FeatureCard }) {
  return (
    <>
      <Image
        src={card.frameSrc}
        alt=""
        fill
        priority={card.priority}
        sizes="(min-width: 1024px) 276px, (min-width: 640px) 45vw, 84vw"
        className="object-contain drop-shadow-[0_12px_20px_rgba(31,31,31,0.08)]"
      />
      <span className="relative z-10 flex h-full flex-col px-[12%] pb-[8%]">
        <span className="flex h-[36%] shrink-0 flex-col justify-start pt-7 sm:pt-8 lg:pt-[30px]">
          <span className="flex min-h-7 items-start justify-between gap-2">
            <span className="block text-[20px] font-bold leading-7 text-[#1F1F1F] sm:text-[21px]">
              {card.title}
            </span>
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-pill bg-neutral-0/80 text-body-sm font-bold text-neutral-700 shadow-sm transition-colors group-hover:text-primary-600"
            >
              →
            </span>
          </span>
          <span className="mt-2 block min-h-[44px] text-[14px] font-semibold leading-[1.5] text-neutral-600 sm:text-[15px]">
            {card.description}
          </span>
        </span>

        <span className="flex min-h-0 flex-1 items-end justify-center overflow-hidden pt-3">
          <Image
            src={card.visualSrc}
            alt={`${card.title} 비주얼`}
            width={5016}
            height={5016}
            sizes="(min-width: 1024px) 214px, (min-width: 640px) 220px, 58vw"
            className={`mx-auto h-auto max-h-full object-contain transition-transform duration-200 group-hover:scale-[1.03] ${card.visualClassName}`}
          />
        </span>
      </span>
    </>
  );
}

function LandingFeatureCard({ card }: { card: FeatureCard }) {
  if (card.href) {
    return (
      <Link href={card.href} className={cardClassName}>
        <CardContent card={card} />
      </Link>
    );
  }

  return (
    <HeaderLoginButton
      className={`${cardClassName} border-transparent bg-transparent p-0 hover:bg-transparent disabled:text-neutral-400!`}
      loadingText="Google로 이동 중..."
    >
      <CardContent card={card} />
    </HeaderLoginButton>
  );
}

function LandingFeatureCards() {
  return (
    <section
      id="service"
      className="relative z-20 -mt-10 bg-[#FFFDF8] pb-12 md:-mt-12 md:pb-16"
    >
      <div className={landingContainerClassName}>
        <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-3 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
          {featureCards.map((card) => (
            <LandingFeatureCard key={card.title} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingCTA() {
  return (
    <section className="bg-[#FFFDF8] py-8 md:py-10">
      <div className={landingContainerClassName}>
        <div className="mx-auto flex flex-col items-center overflow-hidden rounded-2xl border border-primary-100 bg-[#FFF3E8] px-5 py-8 text-center shadow-sm md:px-8 md:py-10">
          <h2 className="text-[28px] font-bold leading-9 text-[#1F1F1F] md:text-[32px] md:leading-10">
            제주에서 좋은 인연을 시작해보세요.
          </h2>
          <div className="mt-5 flex w-full max-w-md flex-col justify-center gap-3 sm:max-w-none sm:flex-row">
            <Link
              href="/jobs"
              className={secondaryCtaClassName}
            >
              모집글 둘러보기
            </Link>
            <HeaderLoginButton className={primaryCtaClassName}>
              Google로 시작하기
            </HeaderLoginButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer id="faq" className="bg-[#FFFDF8] py-8 md:py-10">
      <div className={landingContainerClassName}>
        <div className="flex flex-col gap-4 border-t border-primary-100/80 pt-8 text-body-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <BrandLogo className="h-8" />
            <p className="font-semibold text-neutral-700">© 2026 스탭핑</p>
          </div>
          <p className="font-medium text-neutral-700">
            제주 게스트하우스와 스탭을 자연스럽게 연결합니다.
          </p>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <main className="min-h-screen bg-[#FFFDF8]">
      <LandingHero />
      <LandingFeatureCards />
      <LandingCTA />
      <LandingFooter />
    </main>
  );
}

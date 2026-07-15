import Image from "next/image";
import Link from "next/link";
import { AnalyticsEventTracker } from "@/components/analytics/AnalyticsEventTracker";
import { HeaderLoginButton } from "@/components/auth/HeaderLoginButton";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  LandingFAQAccordion,
  type FAQItem,
} from "@/components/landing/LandingFAQAccordion";
import type { UserRole } from "@/types/database";

interface FeatureCard {
  title: string;
  description: string;
  frameSrc: string;
  visualSrc: string;
  visualWidth: string;
  visualMaxHeight: string;
  visualTranslateY: string;
  visualScale: string;
  analyticsLocation?: string;
  analyticsEntryRole?: Exclude<UserRole, "admin">;
  priority?: boolean;
  href?: string;
}

const featureCards: FeatureCard[] = [
  {
    title: "모집글 둘러보기",
    description: "원하는 제주 게스트하우스를 찾아보세요.",
    frameSrc: "/images/landing/card-frame-job.png",
    visualSrc: "/images/landing/card-visual-job.png",
    visualWidth: "w-[70%]",
    visualMaxHeight: "max-h-[160px] sm:max-h-[184px] lg:max-h-[170px]",
    visualTranslateY: "translate-y-1",
    visualScale: "scale-100",
    priority: true,
    href: "/jobs",
  },
  {
    title: "스탭으로 시작하기",
    description: "제주에서 머물며 일할 곳을 찾아보세요.",
    frameSrc: "/images/landing/card-frame-staff.png",
    visualSrc: "/images/landing/card-visual-staff.png",
    visualWidth: "w-[63%]",
    visualMaxHeight: "max-h-[152px] sm:max-h-[174px] lg:max-h-[162px]",
    visualTranslateY: "translate-y-1",
    visualScale: "scale-100",
    analyticsLocation: "landing_card_staff",
    analyticsEntryRole: "staff",
  },
  {
    title: "사장님으로 시작하기",
    description: "우리 게스트하우스와 맞는 스탭을 만나보세요.",
    frameSrc: "/images/landing/card-frame-owner.png",
    visualSrc: "/images/landing/card-visual-owner.png",
    visualWidth: "w-[60%]",
    visualMaxHeight: "max-h-[150px] sm:max-h-[172px] lg:max-h-[160px]",
    visualTranslateY: "translate-y-1",
    visualScale: "scale-100",
    analyticsLocation: "landing_card_owner",
    analyticsEntryRole: "owner",
  },
  {
    title: "간편하게 연결하기",
    description: "지원과 모집 관리를 한곳에서 확인해요.",
    frameSrc: "/images/landing/card-frame-connect.png",
    visualSrc: "/images/landing/card-visual-connect.png",
    visualWidth: "w-[57%]",
    visualMaxHeight: "max-h-[140px] sm:max-h-[160px] lg:max-h-[148px]",
    visualTranslateY: "translate-y-1",
    visualScale: "scale-100",
    analyticsLocation: "landing_card_connect",
  },
];

const faqItems: FAQItem[] = [
  {
    question: "스탭핑은 어떤 서비스인가요?",
    answer:
      "스탭핑은 제주 게스트하우스와 스탭 지원자를 연결하는 구인·구직 플랫폼입니다. 스탭은 제주 게스트하우스 모집글을 탐색하고 지원할 수 있으며, 사장님은 모집글과 지원자를 한곳에서 관리할 수 있습니다.",
  },
  {
    question: "제주 게스트하우스 스탭 모집글은 어떻게 찾나요?",
    answer:
      "스탭핑의 ‘모집글 둘러보기’에서 제주 게스트하우스 스탭 모집글을 확인할 수 있습니다. 지역, 입도 가능일, 근무 조건을 선택해 자신에게 맞는 공고를 검색하고 비교할 수 있습니다.",
  },
  {
    question: "마음에 드는 게스트하우스 모집글에는 어떻게 지원하나요?",
    answer:
      "모집글에서 근무 기간, 근무일, 휴무일, 주요 업무와 제공 조건을 확인한 뒤 지원할 수 있습니다. Google 계정으로 시작하면 관심 공고를 저장하고 제출한 지원서의 진행 상태도 확인할 수 있습니다.",
  },
  {
    question: "모든 제주 게스트하우스가 숙소·식사·급여를 제공하나요?",
    answer:
      "숙소, 식사, 급여 또는 활동비 제공 여부는 게스트하우스와 모집글마다 다릅니다. 지원하기 전에 각 모집글에 표시된 근무 조건과 제공 항목을 반드시 확인해 주세요.",
  },
  {
    question: "게스트하우스 사장님은 스탭핑에서 어떻게 스탭을 모집하나요?",
    answer:
      "사장님은 Google 계정으로 시작한 뒤 게스트하우스 정보와 스탭 모집글을 등록할 수 있습니다. 등록한 모집글의 상태를 관리하고 지원자의 지원서와 채용 진행 상태를 한곳에서 확인할 수 있습니다.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

const cardClassName =
  "group relative aspect-[4488/5608] w-[84vw] max-w-[318px] shrink-0 cursor-pointer text-left transition-all duration-200 hover:-translate-y-1 hover:drop-shadow-[0_18px_28px_rgba(31,31,31,0.12)] focus-ring sm:w-full sm:max-w-none";

const landingContainerClassName = "mx-auto w-full max-w-[1200px] px-5 md:px-8";

const googleCtaClassName =
  "inline-flex h-12 items-center justify-center gap-3 rounded-sm border border-[#747775] bg-neutral-0 px-4 text-[15px] font-medium text-[#1F1F1F] shadow-none transition-colors hover:bg-[#F7F8F8] active:bg-[#EEF0F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A73E8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:text-[#1F1F1F]!";

const brandCtaClassName =
  "inline-flex h-12 items-center justify-center rounded-sm border border-primary-500 bg-primary-500 px-4 text-[15px] font-bold text-white shadow-sm transition-colors hover:bg-primary-600 focus-ring";

function GoogleIcon() {
  return (
    <span
      aria-hidden="true"
      className="flex size-5 shrink-0 items-center justify-center"
    >
      <svg viewBox="0 0 24 24" className="size-5" focusable="false">
        <path
          fill="#4285F4"
          d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.52z"
        />
        <path
          fill="#34A853"
          d="M12 22c2.7 0 4.97-.9 6.62-2.43l-3.24-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.76-5.59-4.12H3.07v2.6A10 10 0 0 0 12 22z"
        />
        <path
          fill="#FBBC05"
          d="M6.41 13.89A6.01 6.01 0 0 1 6.1 12c0-.66.11-1.3.31-1.89v-2.6H3.07A10 10 0 0 0 2 12c0 1.61.39 3.13 1.07 4.49l3.34-2.6z"
        />
        <path
          fill="#EA4335"
          d="M12 5.99c1.47 0 2.78.5 3.82 1.5l2.87-2.87C16.96 3.01 14.7 2 12 2a10 10 0 0 0-8.93 5.51l3.34 2.6C7.2 7.75 9.4 5.99 12 5.99z"
        />
      </svg>
    </span>
  );
}

function LandingHeader() {
  return (
    <header className="flex h-16 w-full items-center justify-between gap-4 rounded-pill border border-primary-100/70 bg-neutral-0/80 px-4 shadow-sm backdrop-blur sm:px-5 md:px-6">
      <Link
        href="/"
        className="flex shrink-0 items-center rounded-md focus-ring"
        aria-label="스탭핑 홈"
      >
        <BrandLogo className="h-9" priority />
      </Link>

      <nav
        aria-label="홈 메뉴"
        className="hidden items-center gap-3 text-[15px] font-semibold leading-6 text-neutral-700 md:flex"
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
      <div className={`${landingContainerClassName} relative z-10 flex flex-col pb-8 pt-5 md:pb-10 md:pt-6`}>
        <LandingHeader />

        <div className="grid items-center gap-10 py-10 md:grid-cols-[minmax(0,56%)_minmax(0,44%)] md:gap-12 md:py-14 lg:grid-cols-[minmax(0,54%)_minmax(0,46%)] lg:gap-16 lg:py-16">
          <div className="min-w-0 text-left">
            <h1 className="max-w-[760px] text-[38px] font-extrabold leading-[1.14] tracking-normal text-[#1F1F1F] sm:text-[48px] md:text-[56px] lg:text-[62px]">
              <span className="block">
                <span className="text-primary-500">제주</span>의 낭만이
              </span>
              <span className="block">우리의 일상이 되는 곳</span>
            </h1>
            <p className="mt-6 max-w-[680px] whitespace-pre-line text-[16px] font-medium leading-[1.65] text-neutral-600 sm:text-[18px]">
              {`사장님에게는 믿음직한 가족을, 스탭에게는 잊지 못할 제주의 하루를.
머무름이 특별해지는 만남을 지금 준비해 보세요.`}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <HeaderLoginButton
                className={`${googleCtaClassName} w-full sm:w-auto sm:min-w-[190px]`}
                ctaLocation="landing_hero"
              >
                <GoogleIcon />
                <span>Google로 시작하기</span>
              </HeaderLoginButton>
              <Link href="/jobs" className={`${brandCtaClassName} w-full sm:w-auto sm:min-w-[168px]`}>
                모집글 둘러보기
              </Link>
            </div>
          </div>

          <div className="mx-auto w-[84vw] max-w-[360px] md:mx-0 md:w-full md:max-w-[460px] md:justify-self-end lg:max-w-[540px]">
            <Image
              src="/images/landing/hero-jeju.png"
              alt="제주 오름과 게스트하우스 일러스트"
              width={5792}
              height={4344}
              priority
              sizes="(min-width: 1024px) 540px, (min-width: 768px) 460px, 84vw"
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
      <span className="absolute inset-x-[7%] bottom-[7%] top-[26%] z-10 flex flex-col overflow-hidden sm:inset-x-[8%] lg:inset-x-[10.5%]">
        <span className="flex shrink-0 flex-col gap-3 [text-wrap:pretty] [word-break:keep-all]">
          <span className="m-0 block max-w-full text-[18px] font-extrabold leading-[1.25] tracking-normal text-[#1F1F1F] sm:text-[19px] lg:text-[20px]">
            <span className="line-clamp-2">{card.title}</span>
          </span>
          <span className="m-0 block overflow-hidden text-[14px] font-semibold leading-[1.55] text-neutral-600 sm:text-[15px]">
            <span className="line-clamp-3">{card.description}</span>
          </span>
        </span>

        <span className="mt-auto flex min-h-0 flex-1 items-end justify-center overflow-hidden pt-4">
          <Image
            src={card.visualSrc}
            alt={`${card.title} 비주얼`}
            width={5016}
            height={5016}
            sizes="(min-width: 1024px) 214px, (min-width: 640px) 220px, 58vw"
            className={`mx-auto h-auto object-contain transition-transform duration-200 group-hover:scale-[1.03] ${card.visualWidth} ${card.visualMaxHeight} ${card.visualTranslateY} ${card.visualScale}`}
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
      ctaLocation={card.analyticsLocation}
      entryRole={card.analyticsEntryRole}
    >
      <CardContent card={card} />
    </HeaderLoginButton>
  );
}

function LandingFeatureCards() {
  return (
    <section
      id="service"
      className="relative z-20 bg-[#FFFDF8] pb-12 pt-2 md:pb-16 md:pt-4"
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
    <section className="bg-[#FFFDF8] pb-4 md:pb-10 lg:pb-12">
      <div className={landingContainerClassName}>
        <div className="mx-auto flex flex-col items-center overflow-hidden rounded-[28px] border border-primary-100 bg-[#FFF3E8] px-5 py-10 text-center shadow-[0_12px_24px_rgba(31,31,31,0.04)] md:px-8 md:py-16 lg:py-[68px]">
          <h2 className="max-w-[820px] text-[25px] font-extrabold leading-[1.35] text-[#1F1F1F] sm:text-[28px] md:text-[34px]">
            <span className="block">
              낮에는 푸른 바다, 밤에는 밤하늘 별빛 아래서
            </span>
            <span className="block">
              쉼표 하나 찍고,{" "}
              <span className="text-primary-500">놀당 갑서양</span>
            </span>
          </h2>
          <div className="mt-8 flex w-full max-w-[320px] flex-col justify-center gap-3 sm:max-w-none sm:flex-row">
            <Link
              href="/jobs"
              className={`${brandCtaClassName} w-full sm:w-auto sm:min-w-[168px]`}
            >
              모집글 둘러보기
            </Link>
            <HeaderLoginButton
              className={`${googleCtaClassName} w-full sm:w-auto sm:min-w-[190px]`}
              ctaLocation="landing_bottom_cta"
            >
              <GoogleIcon />
              <span>Google로 시작하기</span>
            </HeaderLoginButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingFAQ() {
  return (
    <section
      id="faq"
      className="bg-[#FFFDF8] pt-10 pb-12 md:pt-14 md:pb-16 lg:pb-20"
    >
      <div className={landingContainerClassName}>
        <div className="max-w-[760px]">
          <p className="text-body-sm font-bold text-primary-600">
            자주 묻는 질문
          </p>
          <h2 className="mt-2 text-[28px] font-extrabold leading-9 text-[#1F1F1F] md:text-[36px] md:leading-[1.2]">
            제주 게스트하우스 스탭 모집이 궁금하다면
          </h2>
        </div>

        <div className="mt-7 max-w-[1080px] md:mt-9">
          <LandingFAQAccordion items={faqItems} />
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="bg-[#FFFDF8] py-8 md:py-10">
      <div className={landingContainerClassName}>
        <div className="flex flex-col gap-4 border-t border-primary-100/80 pt-8 text-body-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <BrandLogo className="h-8" />
            <p className="font-semibold text-neutral-700">© 2026 스탭핑</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <p className="font-medium text-neutral-700">
              제주 게스트하우스와 스탭을 자연스럽게 연결합니다.
            </p>
            <a
              href="mailto:bwj0721@naver.com"
              className="font-medium text-neutral-600 transition-colors hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              문의: bwj0721@naver.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <main className="min-h-screen bg-[#FFFDF8]">
      <AnalyticsEventTracker
        eventName={ANALYTICS_EVENTS.LANDING_VIEW}
        properties={{ page: "landing" }}
      />
      <LandingHero />
      <LandingFeatureCards />
      <LandingFAQ />
      <LandingCTA />
      <LandingFooter />
    </main>
  );
}

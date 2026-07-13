import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserDestination } from "@/lib/auth/onboarding";
import { LandingPage } from "@/components/landing/LandingPage";

export const dynamic = "force-dynamic";

const title = "제주도 게스트하우스 스탭 모집·지원 | 스탭핑";
const ogTitle = "제주 게스트하우스 스탭 모집부터 지원까지 | 스탭핑";
const description =
  "제주도 게스트하우스 스탭 모집 플랫폼 스탭핑에서 지역, 입도 가능일, 근무 조건에 맞는 모집글을 찾아보세요. 관심 공고를 저장하고 게스트하우스별 조건을 비교할 수 있습니다. 원하는 모집글에 지원하고 지원 현황도 확인할 수 있습니다.";
const siteUrl = "https://staffing-jeju.vercel.app/";
const ogImage = "/images/og/staffing-og.png";
const ogImageAlt = "제주도 게스트하우스 스탭 모집 플랫폼 스탭핑";

export const metadata: Metadata = {
  title: {
    absolute: title,
  },
  description,
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: ogTitle,
    description,
    url: siteUrl,
    siteName: "스탭핑",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: ogImage,
        width: 2400,
        height: 1200,
        alt: ogImageAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: ogTitle,
    description,
    images: [ogImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function HomePage() {
  const { user, destination } = await getCurrentUserDestination();

  if (user && destination !== "/") {
    redirect(destination);
  }

  return <LandingPage />;
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://staffing-jeju.vercel.app"),
  title: {
    default: "제주도 게스트하우스 스탭 모집·지원 | 스탭핑",
    template: "%s | 스탭핑",
  },
  description:
    "제주도 게스트하우스 스탭 모집 플랫폼 스탭핑에서 지역, 입도 가능일, 근무 조건에 맞는 모집글을 찾아보세요.",
  openGraph: {
    siteName: "스탭핑",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/images/og/staffing-og.png",
        alt: "제주도 게스트하우스 스탭 모집 플랫폼 스탭핑",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/images/og/staffing-og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

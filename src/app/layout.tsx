import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "스탭핑 - 게스트하우스 스탭 모집",
  description: "제주도 게스트하우스 스탭 모집 플랫폼",
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

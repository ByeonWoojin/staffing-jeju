"use client";

import { Button } from "@/components/ui";
import "./globals.css";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-surface antialiased">
        <main className="flex min-h-screen items-center justify-center px-5 py-10">
          <section className="w-full max-w-md rounded-md border border-neutral-100 bg-neutral-0 p-6 text-center shadow-sm">
            <h1 className="text-title text-neutral-900">
              일시적인 오류가 발생했습니다.
            </h1>
            <p className="mt-2 text-body-sm text-neutral-500">
              화면을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </p>
            <Button type="button" className="mt-6" onClick={reset}>
              다시 시도
            </Button>
          </section>
        </main>
      </body>
    </html>
  );
}

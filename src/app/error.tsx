"use client";

import { Button, Card } from "@/components/ui";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 md:px-6">
      <div className="mx-auto w-full max-w-md">
        <Card className="text-center">
          <h1 className="text-title text-neutral-900">
            화면을 불러오지 못했습니다.
          </h1>
          <p className="mt-2 text-body-sm text-neutral-500">
            잠시 후 다시 시도해주세요.
          </p>
          <Button type="button" className="mt-6" onClick={reset}>
            다시 시도
          </Button>
        </Card>
      </div>
    </main>
  );
}

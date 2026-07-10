"use client";

import { useState } from "react";
import { getShareLink } from "@/lib/owner-data";
import { Button, Card, CardContent } from "@/components/ui";

interface ShareLinkBoxProps {
  slug: string;
  title?: string;
}

export function ShareLinkBox({ slug, title }: ShareLinkBoxProps) {
  const [copied, setCopied] = useState(false);
  const shareLink = getShareLink(slug);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      //TODO: Toast로 '링크가 복사되었습니다' 표시
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("링크 복사에 실패했습니다.");
    }
  };

  return (
    <Card>
      <CardContent className="pt-5 md:pt-6">
        {title && (
          <p className="mb-3 text-body-sm font-semibold text-neutral-800">
            {title}
          </p>
        )}
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="break-all text-body-sm text-neutral-700">{shareLink}</p>
        </div>
        <Button
          variant="soft-primary"
          className="mt-4"
          onClick={handleCopy}
        >
          {copied ? "복사 완료" : "링크 복사"}
        </Button>
        <p className="mt-3 text-caption text-neutral-400">
          네이버 카페, 인스타그램, 카카오톡 등에 공유해보세요.
        </p>
      </CardContent>
    </Card>
  );
}

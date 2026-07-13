"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { toggleFavoriteGuesthouse } from "@/app/jobs/actions";
import { cn } from "@/lib/cn";
import { Button, type ButtonProps } from "@/components/ui";

interface FavoriteGuesthouseButtonProps {
  guesthouseId: string;
  initialFavorited: boolean;
  size?: ButtonProps["size"];
  fullWidth?: boolean;
  presentation?: "text" | "icon";
  className?: string;
}

export function FavoriteGuesthouseButton({
  guesthouseId,
  initialFavorited,
  size = "sm",
  fullWidth = false,
  presentation = "text",
  className,
}: FavoriteGuesthouseButtonProps) {
  const router = useRouter();
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isPending, setIsPending] = useState(false);

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isPending) return;

    setIsPending(true);
    try {
      const result = await toggleFavoriteGuesthouse(guesthouseId);
      if (!result.ok) {
        alert(result.message);
        if (result.redirectTo) router.push(result.redirectTo);
        return;
      }

      setIsFavorited(result.isFavorited);
      router.refresh();
    } catch (error) {
      console.error("[FavoriteGuesthouseButton] toggle failed", error);
      alert("관심 게스트하우스 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsPending(false);
    }
  };

  const isIcon = presentation === "icon";

  return (
    <Button
      variant={isFavorited ? "secondary" : "outline"}
      size={size}
      fullWidth={fullWidth}
      disabled={isPending}
      onClick={handleClick}
      aria-pressed={isFavorited}
      aria-label={isFavorited ? "관심 게스트하우스 삭제" : "관심 게스트하우스 추가"}
      className={cn(
        isIcon &&
          (isFavorited
            ? "border-primary-500 bg-primary-500 text-white! shadow-sm hover:bg-primary-600"
            : "border-neutral-200 bg-neutral-0/90 text-neutral-800 shadow-sm backdrop-blur hover:bg-neutral-0"),
        className,
      )}
    >
      {isIcon
        ? isPending
          ? "..."
          : isFavorited
            ? "♥"
            : "♡"
        : isPending
          ? "처리 중..."
          : isFavorited
            ? "관심 저장됨"
            : "관심 게하"}
    </Button>
  );
}

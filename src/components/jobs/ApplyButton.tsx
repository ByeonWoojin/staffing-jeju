"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkApplyAvailability } from "@/app/jobs/actions";
import { Button } from "@/components/ui";

export function ApplyButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    if (isPending) return;

    setIsPending(true);
    try {
      const result = await checkApplyAvailability();
      alert(result.message);
      if (result.redirectTo) router.push(result.redirectTo);
    } catch (error) {
      console.error("[ApplyButton] check failed", error);
      alert("지원 기능을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button size="lg" fullWidth disabled={isPending} onClick={handleClick}>
      {isPending ? "확인 중..." : "지원하기"}
    </Button>
  );
}

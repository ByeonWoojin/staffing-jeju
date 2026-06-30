"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelStaffApplication } from "@/app/staff/applications/actions";
import { Button } from "@/components/ui";

export function CancelApplicationButton({
  applicationId,
}: {
  applicationId: string;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleCancel = async () => {
    if (isPending) return;
    if (!confirm("이 지원을 취소하시겠습니까?")) return;

    setIsPending(true);
    try {
      const result = await cancelStaffApplication(applicationId);
      alert(result.message);
      if ("redirectTo" in result && result.redirectTo) {
        router.push(result.redirectTo);
        return;
      }
      if (result.ok) router.refresh();
    } catch (error) {
      console.error("[CancelApplicationButton] cancel failed", error);
      alert("지원 취소에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline-danger"
      size="sm"
      onClick={handleCancel}
      disabled={isPending}
    >
      {isPending ? "취소 중..." : "지원 취소"}
    </Button>
  );
}

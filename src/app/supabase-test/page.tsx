"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";

export default function SupabaseTestPage() {
  const [status, setStatus] = useState<"checking" | "success" | "error">(
    "checking",
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.getSession();

        if (error) {
          setStatus("error");
          setErrorMessage(error.message);
          return;
        }

        setStatus("success");
      } catch (error) {
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        );
      }
    };

    void checkConnection();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5 py-10">
      <Card className="w-full max-w-md">
        {status === "checking" && (
          <p className="text-body-sm text-neutral-600">Supabase 연결 확인 중...</p>
        )}
        {status === "success" && (
          <p className="text-body font-semibold text-success-muted">
            Supabase 연결 성공
          </p>
        )}
        {status === "error" && (
          <div className="space-y-2">
            <p className="text-body font-semibold text-danger-muted">
              Supabase 연결 실패
            </p>
            <p className="text-body-sm text-neutral-700">{errorMessage}</p>
          </div>
        )}
      </Card>
    </main>
  );
}

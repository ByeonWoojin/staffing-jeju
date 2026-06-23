"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-lg border border-gray-200 p-6">
        {status === "checking" && (
          <p className="text-sm text-gray-600">Supabase 연결 확인 중...</p>
        )}
        {status === "success" && (
          <p className="text-base font-semibold text-green-700">
            Supabase 연결 성공
          </p>
        )}
        {status === "error" && (
          <div className="space-y-2">
            <p className="text-base font-semibold text-red-700">
              Supabase 연결 실패
            </p>
            <p className="text-sm text-gray-700">{errorMessage}</p>
          </div>
        )}
      </div>
    </main>
  );
}

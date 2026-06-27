"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

export function GoogleLoginButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      alert(`Google 로그인에 실패했습니다: ${error.message}`);
      setIsLoading(false);
    }
  };

  return (
    <Button fullWidth onClick={handleLogin} disabled={isLoading}>
      {isLoading ? "Google로 이동 중..." : "Google로 로그인"}
    </Button>
  );
}

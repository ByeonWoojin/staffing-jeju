"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { LogoutButton } from "@/components/auth/LogoutButton";

interface OwnerAccountState {
  name: string | null;
  email: string | null;
}

export function OwnerAccountMenu() {
  const [account, setAccount] = useState<OwnerAccountState | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAccount() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) setAccount(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      setAccount({
        name:
          typeof profile?.name === "string" && profile.name.trim()
            ? profile.name
            : null,
        email: user.email ?? profile?.email ?? null,
      });
    }

    void loadAccount();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex min-w-0 items-center gap-3">
      {account && (
        <div className="hidden min-w-0 text-right sm:block">
          {account.name && (
            <p className="truncate text-body-sm font-semibold text-neutral-800">
              {account.name}님
            </p>
          )}
          {account.email && (
            <p className="truncate text-caption text-neutral-500">
              {account.email}
            </p>
          )}
        </div>
      )}
      <LogoutButton />
    </div>
  );
}

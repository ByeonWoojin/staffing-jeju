"use client";

import { createContext, useContext, type ReactNode } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";

export interface OwnerAccountMenuAccount {
  name: string | null;
  email: string | null;
}

const OwnerAccountContext = createContext<OwnerAccountMenuAccount | null>(null);

export function OwnerAccountProvider({
  account,
  children,
}: {
  account: OwnerAccountMenuAccount | null;
  children: ReactNode;
}) {
  return (
    <OwnerAccountContext.Provider value={account}>
      {children}
    </OwnerAccountContext.Provider>
  );
}

export function OwnerAccountMenu() {
  const account = useContext(OwnerAccountContext);

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
      <LogoutButton userRole="owner" />
    </div>
  );
}

import { type ReactNode } from "react";
import { OwnerHeader } from "@/components/layout/OwnerHeader";
import { OwnerMobileNav, OwnerNav } from "@/components/layout/OwnerNav";

export interface OwnerLayoutProps {
  children: ReactNode;
}

export function OwnerLayout({ children }: OwnerLayoutProps) {
  return (
    <div className="min-h-screen bg-surface">
      <OwnerHeader />
      <OwnerMobileNav />

      <div className="page-container py-5 md:py-7">
        <div className="flex gap-7">
          <aside className="hidden w-52 shrink-0 md:block">
            <div className="sticky top-6 rounded-md border border-neutral-100 bg-neutral-0 p-2 shadow-sm">
              <OwnerNav />
            </div>
          </aside>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}

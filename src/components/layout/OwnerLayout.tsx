import { type ReactNode } from "react";
import { OwnerHeader } from "@/components/layout/OwnerHeader";
import { OwnerMobileNav, OwnerNav } from "@/components/layout/OwnerNav";
import { getOwnerNewApplicationCount } from "@/lib/owner-supabase-data";

export interface OwnerLayoutProps {
  children: ReactNode;
  newApplicationCount?: number;
}

export async function OwnerLayout({
  children,
  newApplicationCount,
}: OwnerLayoutProps) {
  const resolvedNewApplicationCount =
    newApplicationCount ?? (await getOwnerNewApplicationCount());

  return (
    <div className="min-h-screen bg-surface">
      <OwnerHeader />
      <OwnerMobileNav newApplicationCount={resolvedNewApplicationCount} />

      <div className="page-container py-5 md:py-7">
        <div className="flex gap-7">
          <aside className="hidden w-52 shrink-0 md:block">
            <div className="sticky top-6 rounded-md border border-neutral-100 bg-neutral-0 p-2 shadow-sm">
              <OwnerNav newApplicationCount={resolvedNewApplicationCount} />
            </div>
          </aside>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}

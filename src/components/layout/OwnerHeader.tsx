import Link from "next/link";
import { OwnerAccountMenu } from "@/components/auth/OwnerAccountMenu";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function OwnerHeader() {
  return (
    <header className="border-b border-neutral-100 bg-neutral-0">
      <div className="page-container flex h-14 items-center justify-between gap-4">
        <Link href="/owner" className="flex items-center gap-2 focus-ring rounded-md">
          <BrandLogo className="h-7 sm:h-8" priority />
          <span className="rounded-pill border border-neutral-200 bg-neutral-0 px-2 py-1 text-caption font-semibold text-neutral-500">
            사장님
          </span>
        </Link>

        <OwnerAccountMenu />
      </div>
    </header>
  );
}

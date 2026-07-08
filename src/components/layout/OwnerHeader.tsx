import Link from "next/link";
import { OwnerAccountMenu } from "@/components/auth/OwnerAccountMenu";

export function OwnerHeader() {
  return (
    <header className="border-b border-neutral-100 bg-neutral-0">
      <div className="page-container flex h-14 items-center justify-between gap-4">
        <Link href="/owner" className="flex items-center gap-2 focus-ring rounded-md">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-500 text-body-sm font-bold text-white">
            S
          </span>
          <div className="flex flex-col">
            <span className="text-body-sm font-bold text-neutral-800">스탭핑</span>
            <span className="text-caption text-neutral-500">사장님</span>
          </div>
        </Link>

        <OwnerAccountMenu />
      </div>
    </header>
  );
}

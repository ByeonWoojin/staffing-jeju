import Link from "next/link";
import { cn } from "@/lib/cn";
import type { getPublicJobs } from "@/lib/public-job-data";

type JobsSearchParams = Record<string, string | string[] | undefined>;

function createPageHref(basePath: string, searchParams: JobsSearchParams, page: number) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || value === undefined) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) params.append(key, item);
      }
      continue;
    }

    if (value) params.set(key, value);
  }

  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

function getVisiblePageNumbers(currentPage: number, totalPages: number) {
  const maxVisiblePages = 5;
  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const halfWindow = Math.floor(maxVisiblePages / 2);
  let start = Math.max(1, currentPage - halfWindow);
  const end = Math.min(totalPages, start + maxVisiblePages - 1);

  if (end - start + 1 < maxVisiblePages) {
    start = Math.max(1, end - maxVisiblePages + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function JobsPagination({
  pagination,
  searchParams,
  basePath = "/jobs",
}: {
  pagination: Awaited<ReturnType<typeof getPublicJobs>>["pagination"];
  searchParams: JobsSearchParams;
  basePath?: string;
}) {
  if (pagination.totalPages <= 1) return null;

  const { currentPage, totalPages } = pagination;
  const pageNumbers = getVisiblePageNumbers(currentPage, totalPages);
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const baseButtonClassName =
    "inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-caption font-bold transition-colors focus-ring";
  const enabledButtonClassName =
    "border-transparent bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900";
  const disabledButtonClassName =
    "cursor-not-allowed border-transparent bg-transparent text-neutral-300";

  return (
    <nav
      aria-label="모집글 페이지네이션"
      className="mt-1 flex justify-center border-t border-neutral-100 pt-3"
    >
      <div className="flex flex-wrap items-center justify-center gap-0.5">
        {hasPrevious ? (
          <Link
            href={createPageHref(basePath, searchParams, currentPage - 1)}
            className={cn(baseButtonClassName, enabledButtonClassName)}
            aria-label="이전 페이지로 이동"
          >
            &lt;
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={cn(baseButtonClassName, disabledButtonClassName)}
          >
            &lt;
          </span>
        )}

        {pageNumbers.map((page) =>
          page === currentPage ? (
            <span
              key={page}
              aria-current="page"
              className={cn(
                baseButtonClassName,
                "border-primary-500 bg-primary-500 px-0 text-white!",
              )}
            >
              {page}
            </span>
          ) : (
            <Link
              key={page}
              href={createPageHref(basePath, searchParams, page)}
              className={cn(baseButtonClassName, enabledButtonClassName, "px-0")}
              aria-label={`${page}페이지로 이동`}
            >
              {page}
            </Link>
          ),
        )}

        {hasNext ? (
          <Link
            href={createPageHref(basePath, searchParams, currentPage + 1)}
            className={cn(baseButtonClassName, enabledButtonClassName)}
            aria-label="다음 페이지로 이동"
          >
            &gt;
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={cn(baseButtonClassName, disabledButtonClassName)}
          >
            &gt;
          </span>
        )}
      </div>
    </nav>
  );
}

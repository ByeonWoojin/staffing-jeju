import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between md:mb-7",
        className,
      )}
    >
      <div className="min-w-0 flex flex-col gap-1.5">
        <h1 className="break-keep text-h2 text-neutral-900">{title}</h1>
        {description && (
          <p className="text-body-sm text-neutral-500">{description}</p>
        )}
      </div>
      {action && (
        <div className="w-full shrink-0 sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">
          {action}
        </div>
      )}
    </header>
  );
}

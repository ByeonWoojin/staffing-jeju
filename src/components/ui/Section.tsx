import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  action?: ReactNode;
  spacing?: "sm" | "md" | "lg";
}

const spacingStyles = {
  sm: "mb-5",
  md: "mb-7",
  lg: "mb-10",
} as const;

export function Section({
  className,
  title,
  description,
  action,
  spacing = "md",
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cn(spacingStyles[spacing], className)} {...props}>
      {(title || description || action) && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex flex-col gap-1">
            {title && (
              <h2 className="break-keep text-title text-neutral-900">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-body-sm text-neutral-500">{description}</p>
            )}
          </div>
          {action && (
            <div className="w-full shrink-0 sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">
              {action}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

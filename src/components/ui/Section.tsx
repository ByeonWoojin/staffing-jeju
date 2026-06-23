import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  action?: ReactNode;
  spacing?: "sm" | "md" | "lg";
}

const spacingStyles = {
  sm: "mb-6",
  md: "mb-8",
  lg: "mb-12",
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
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            {title && (
              <h2 className="text-h3 text-neutral-800">{title}</h2>
            )}
            {description && (
              <p className="text-body-sm text-neutral-500">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

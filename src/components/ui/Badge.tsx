import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import {
  getApplicationStatusLabel,
  getJobStatusLabel,
  type ApplicationStatus,
  type JobStatus,
} from "@/lib/labels";

const baseStyles =
  "inline-flex items-center rounded-pill px-2.5 py-1 text-caption font-semibold whitespace-nowrap";

const variantStyles = {
  /* Job status */
  "job-open": "bg-primary-50 text-primary-700",
  "job-closed": "bg-neutral-100 text-neutral-600",
  "job-hidden": "bg-neutral-800 text-neutral-0",

  /* Application status */
  "app-submitted": "bg-primary-50 text-primary-700",
  "app-viewed": "bg-sand-light text-brown",
  "app-accepted": "bg-success-light text-success-muted",
  "app-rejected": "bg-danger-light text-danger-muted",
  "app-canceled": "bg-neutral-100 text-neutral-500",

  /* Feature badges */
  urgent: "bg-primary-500 text-white",
  accommodation: "bg-beige text-brown",
  meal: "bg-beige text-brown",

  /* Generic */
  default: "bg-neutral-100 text-neutral-600",
  primary: "bg-primary-50 text-primary-700",
  success: "bg-success-light text-success-muted",
  warning: "bg-warning-light text-warning",
  danger: "bg-danger-light text-danger-muted",
  info: "bg-neutral-100 text-neutral-600",
  sand: "bg-sand-light text-brown",
} as const;

export type BadgeVariant = keyof typeof variantStyles;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const variantMap: Record<JobStatus, BadgeVariant> = {
    open: "job-open",
    closed: "job-closed",
    hidden: "job-hidden",
  };

  return <Badge variant={variantMap[status]}>{getJobStatusLabel(status)}</Badge>;
}

export function ApplicationStatusBadge({
  status,
}: {
  status: ApplicationStatus;
}) {
  const variantMap: Record<ApplicationStatus, BadgeVariant> = {
    submitted: "app-submitted",
    viewed: "app-viewed",
    accepted: "app-accepted",
    rejected: "app-rejected",
    canceled: "app-canceled",
  };

  return (
    <Badge variant={variantMap[status]}>
      {getApplicationStatusLabel(status)}
    </Badge>
  );
}

export function UrgentBadge() {
  return <Badge variant="urgent">급구</Badge>;
}

export function AccommodationBadge() {
  return <Badge variant="accommodation">숙소 제공</Badge>;
}

export function MealBadge() {
  return <Badge variant="meal">식사 제공</Badge>;
}

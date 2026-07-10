import Link from "next/link";
import { type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { type ButtonSize, type ButtonVariant } from "./Button";

const variantStyles = {
  primary:
    "bg-primary-500 text-white! font-semibold! hover:bg-primary-600 active:bg-primary-700",
  "soft-primary":
    "border border-primary-100 bg-primary-50 text-primary-600! font-semibold! hover:border-primary-200 hover:bg-primary-100 active:bg-primary-100",
  secondary:
    "bg-neutral-100 text-neutral-700! hover:bg-neutral-200 active:bg-neutral-200",
  outline:
    "border border-neutral-200 bg-neutral-0 text-neutral-700! hover:bg-neutral-50 active:bg-neutral-100",
  "outline-danger":
    "border border-danger-light bg-neutral-0 text-danger-muted! hover:bg-danger-light/50 active:bg-danger-light/70",
  danger: "bg-danger-muted text-white! font-semibold! hover:bg-danger active:bg-danger/90",
  ghost: "bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200",
} as const;

const sizeStyles = {
  sm: "h-9 px-3 text-body-sm",
  md: "h-11 px-5 text-body-sm",
  lg: "h-12 px-6 text-body",
} as const;

export interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  fullWidth = false,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors duration-150 focus-ring",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

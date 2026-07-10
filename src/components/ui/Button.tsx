import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const variantStyles = {
  primary:
    "bg-primary-500 text-white! font-semibold! hover:bg-primary-600 active:bg-primary-700 disabled:bg-neutral-200 disabled:text-neutral-400!",
  "soft-primary":
    "border border-primary-100 bg-primary-50 text-primary-600! font-semibold! hover:border-primary-200 hover:bg-primary-100 active:bg-primary-100 disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400!",
  secondary:
    "bg-neutral-100 text-neutral-700! hover:bg-neutral-200 active:bg-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400!",
  outline:
    "border border-neutral-200 bg-neutral-0 text-neutral-700! hover:bg-neutral-50 active:bg-neutral-100 disabled:border-neutral-200 disabled:text-neutral-400!",
  "outline-danger":
    "border border-danger-light bg-neutral-0 text-danger-muted! hover:bg-danger-light/50 active:bg-danger-light/70 disabled:border-neutral-200 disabled:text-neutral-400!",
  danger:
    "bg-danger-muted text-white! font-semibold! hover:bg-danger active:bg-danger/90 disabled:bg-neutral-200 disabled:text-neutral-400!",
  ghost:
    "bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 disabled:text-neutral-400",
} as const;

const sizeStyles = {
  sm: "h-9 px-3 text-body-sm",
  md: "h-11 px-5 text-body-sm",
  lg: "h-12 px-6 text-body",
} as const;

export type ButtonVariant = keyof typeof variantStyles;
export type ButtonSize = keyof typeof sizeStyles;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      fullWidth = false,
      type = "button",
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors duration-150 focus-ring disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

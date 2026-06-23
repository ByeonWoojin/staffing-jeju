import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      id,
      disabled,
      children,
      placeholder,
      ...props
    },
    ref,
  ) => {
    const selectId = id ?? props.name;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-body-sm font-semibold text-neutral-800"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              error
                ? `${selectId}-error`
                : helperText
                  ? `${selectId}-helper`
                  : undefined
            }
            className={cn(
              "h-11 w-full appearance-none rounded-md border bg-neutral-0 px-4 pr-10 text-body text-neutral-800 transition-colors duration-150 focus-ring",
              error
                ? "border-danger focus:border-danger"
                : "border-neutral-200 focus:border-primary-500",
              disabled && "cursor-not-allowed bg-neutral-50 text-neutral-400",
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {children}
          </select>
          <span
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400"
            aria-hidden
          >
            ▾
          </span>
        </div>
        {error ? (
          <p id={`${selectId}-error`} className="text-[13px] text-danger">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${selectId}-helper`} className="text-[13px] text-neutral-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

Select.displayName = "Select";

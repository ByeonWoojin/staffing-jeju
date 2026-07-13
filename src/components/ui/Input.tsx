import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { FormLabelWithHelp } from "./FieldHelp";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelMeta?: string;
  labelHelpText?: string;
  helperText?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      labelMeta,
      labelHelpText,
      helperText,
      error,
      id,
      disabled,
      required,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? props.name;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <FormLabelWithHelp
            htmlFor={inputId}
            label={label}
            required={required}
            metaText={labelMeta}
            helpText={labelHelpText}
          />
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error
              ? `${inputId}-error`
              : helperText
                ? `${inputId}-helper`
                : undefined
          }
          className={cn(
            "h-11 w-full rounded-md border bg-neutral-0 px-4 text-body text-neutral-800 placeholder:text-neutral-400 transition-colors duration-150 focus-ring",
            error
              ? "border-danger focus:border-danger"
              : "border-neutral-200 focus:border-primary-500",
            disabled && "cursor-not-allowed bg-neutral-50 text-neutral-400",
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-[13px] text-danger">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${inputId}-helper`} className="text-[13px] text-neutral-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { FormLabelWithHelp } from "./FieldHelp";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  labelMeta?: string;
  labelHelpText?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
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
    const textareaId = id ?? props.name;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <FormLabelWithHelp
            htmlFor={textareaId}
            label={label}
            required={required}
            metaText={labelMeta}
            helpText={labelHelpText}
          />
        )}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error
              ? `${textareaId}-error`
              : helperText
                ? `${textareaId}-helper`
                : undefined
          }
          className={cn(
            "min-h-[120px] w-full resize-y rounded-md border bg-neutral-0 px-4 py-3 text-body text-neutral-800 placeholder:text-neutral-400 transition-colors duration-150 focus-ring",
            error
              ? "border-danger focus:border-danger"
              : "border-neutral-200 focus:border-primary-500",
            disabled && "cursor-not-allowed bg-neutral-50 text-neutral-400",
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={`${textareaId}-error`} className="text-[13px] text-danger">
            {error}
          </p>
        ) : helperText ? (
          <p
            id={`${textareaId}-helper`}
            className="text-[13px] text-neutral-500"
          >
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

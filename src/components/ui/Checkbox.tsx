import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
  descriptionClassName?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      description,
      descriptionClassName,
      id,
      disabled,
      ...props
    },
    ref,
  ) => {
    const checkboxId = id ?? props.name;

    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          "inline-flex cursor-pointer items-start gap-3",
          disabled && "cursor-not-allowed opacity-60",
          className,
        )}
      >
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          disabled={disabled}
          className="focus-ring mt-0.5 h-5 w-5 shrink-0 rounded border-neutral-300 text-primary-500 accent-primary-500"
          {...props}
        />
        {(label || description) && (
          <span className="flex flex-col gap-0.5">
            {label && (
              <span className="text-body-sm font-semibold text-neutral-800">
                {label}
              </span>
            )}
            {description && (
              <span
                className={cn("text-[13px] text-neutral-500", descriptionClassName)}
              >
                {description}
              </span>
            )}
          </span>
        )}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";

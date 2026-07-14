"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface FieldInfoTooltipProps {
  label: string;
  helpText: string;
  ariaLabel?: string;
  className?: string;
}

export function FieldInfoTooltip({
  label,
  helpText,
  ariaLabel,
  className,
}: FieldInfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const openedByFocusRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <span
      ref={wrapperRef}
      className={cn("relative inline-flex items-center", className)}
      onPointerEnter={() => setIsOpen(true)}
      onPointerLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        aria-label={ariaLabel ?? `${label} 입력 안내`}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipId : undefined}
        onFocus={() => {
          if (!isOpen) {
            openedByFocusRef.current = true;
            setIsOpen(true);
          }
        }}
        onBlur={() => setIsOpen(false)}
        onClick={() => {
          if (openedByFocusRef.current) {
            openedByFocusRef.current = false;
            return;
          }
          setIsOpen((open) => !open);
        }}
        className="inline-flex size-[18px] items-center justify-center rounded-full border border-neutral-300 bg-neutral-0 text-[11px] font-bold leading-none text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      >
        i
      </button>
      {isOpen && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-2 w-[min(17.5rem,calc(100vw-2.5rem))] whitespace-pre-line rounded-xl bg-neutral-900 px-3 py-2.5 text-[13px] font-medium leading-[1.5] text-white shadow-lg"
        >
          {helpText}
          <span
            aria-hidden="true"
            className="absolute -top-1 left-3 size-2 rotate-45 bg-neutral-900"
          />
        </span>
      )}
    </span>
  );
}

interface FormLabelWithHelpProps {
  htmlFor?: string;
  label: string;
  required?: boolean;
  metaText?: string;
  helpText?: string;
  helpAriaLabel?: string;
  className?: string;
  labelClassName?: string;
}

export function FormLabelWithHelp({
  htmlFor,
  label,
  required = false,
  metaText,
  helpText,
  helpAriaLabel,
  className,
  labelClassName,
}: FormLabelWithHelpProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className={cn("text-body-sm font-semibold text-neutral-800", labelClassName)}
      >
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {metaText && (
        <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-neutral-500">
          {metaText}
        </span>
      )}
      {helpText && (
        <FieldInfoTooltip
          label={label}
          helpText={helpText}
          ariaLabel={helpAriaLabel}
        />
      )}
    </div>
  );
}

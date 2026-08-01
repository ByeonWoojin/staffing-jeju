"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "./Button";

interface AlertDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
}

export function AlertDialog({
  open,
  title = "안내",
  message,
  confirmLabel = "확인",
  onClose,
}: AlertDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-neutral-900/40 px-4 py-6 sm:items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-sm rounded-md bg-neutral-0 p-5 shadow-lg"
      >
        <h2 id={titleId} className="text-title text-neutral-900">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-body-sm text-neutral-600">
          {message}
        </p>
        <div className="mt-5 flex justify-end">
          <Button
            ref={confirmButtonRef}
            type="button"
            variant="soft-primary"
            size="sm"
            onClick={onClose}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

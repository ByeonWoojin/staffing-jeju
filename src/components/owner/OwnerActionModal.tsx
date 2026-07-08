"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

interface OwnerActionModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  pending?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function OwnerActionModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "취소",
  tone = "primary",
  pending = false,
  errorMessage,
  onConfirm,
  onCancel,
}: OwnerActionModalProps) {
  useEffect(() => {
    if (!open || !onCancel) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, open]);

  if (!open) return null;

  const titleId = "owner-action-modal-title";
  const descriptionId = "owner-action-modal-description";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/35 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-sm rounded-md bg-neutral-0 p-5 shadow-lg"
      >
        <h2 id={titleId} className="text-title text-neutral-900">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-body-sm text-neutral-600">
          {description}
        </p>
        {errorMessage && (
          <p className="mt-3 rounded-md border border-danger-light bg-danger-light/40 px-3 py-2 text-caption font-semibold text-danger-muted">
            {errorMessage}
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            size="sm"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "처리 중..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

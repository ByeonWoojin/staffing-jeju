"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CoachmarkStep } from "@/lib/onboarding/coachmark-config";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui";

type SpotlightRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type CardPosition = {
  mode: "desktop" | "mobile";
  placement: "top" | "bottom";
  style: CSSProperties;
};

type SpotlightCoachmarkProps = {
  steps: CoachmarkStep[];
  currentStepIndex: number;
  onNext: () => void;
  onComplete: () => void;
  onSkip: () => void;
  onTargetMissing: (stepId: string) => void;
};

const SPOTLIGHT_PADDING = 8;
const VIEWPORT_MARGIN = 16;
const CARD_WIDTH = 344;
const CARD_HEIGHT_ESTIMATE = 190;
const TARGET_RETRY_LIMIT = 12;
const TARGET_RETRY_DELAY_MS = 120;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isElementVisible(element: Element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    rect.width > 0 &&
    rect.height > 0 &&
    element.getClientRects().length > 0
  );
}

function findVisibleTarget(target: string) {
  const elements = Array.from(
    document.querySelectorAll(`[data-coachmark="${target}"]`),
  );

  return elements.find(isElementVisible) ?? null;
}

function getPaddedRect(element: Element): SpotlightRect {
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const left = clamp(
    rect.left - SPOTLIGHT_PADDING,
    VIEWPORT_MARGIN / 2,
    viewportWidth - VIEWPORT_MARGIN,
  );
  const top = clamp(
    rect.top - SPOTLIGHT_PADDING,
    VIEWPORT_MARGIN / 2,
    viewportHeight - VIEWPORT_MARGIN,
  );
  const right = clamp(
    rect.right + SPOTLIGHT_PADDING,
    VIEWPORT_MARGIN,
    viewportWidth - VIEWPORT_MARGIN / 2,
  );
  const bottom = clamp(
    rect.bottom + SPOTLIGHT_PADDING,
    VIEWPORT_MARGIN,
    viewportHeight - VIEWPORT_MARGIN / 2,
  );

  return {
    top,
    left,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function getCardPosition(rect: SpotlightRect): CardPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isMobile = viewportWidth < 640;

  if (isMobile) {
    const targetIsNearBottom = rect.bottom > viewportHeight - 210;
    return {
      mode: "mobile",
      placement: targetIsNearBottom ? "top" : "bottom",
      style: targetIsNearBottom
        ? {
            left: VIEWPORT_MARGIN,
            right: VIEWPORT_MARGIN,
            top: `max(${VIEWPORT_MARGIN}px, env(safe-area-inset-top))`,
          }
        : {
            left: VIEWPORT_MARGIN,
            right: VIEWPORT_MARGIN,
            bottom: `max(${VIEWPORT_MARGIN}px, env(safe-area-inset-bottom))`,
          },
    };
  }

  const hasSpaceBelow = viewportHeight - rect.bottom >= CARD_HEIGHT_ESTIMATE + 16;
  const top = hasSpaceBelow
    ? rect.bottom + 12
    : Math.max(VIEWPORT_MARGIN, rect.top - CARD_HEIGHT_ESTIMATE - 12);
  const maxLeft = Math.max(VIEWPORT_MARGIN, viewportWidth - CARD_WIDTH - VIEWPORT_MARGIN);
  const left = clamp(rect.left, VIEWPORT_MARGIN, maxLeft);

  return {
    mode: "desktop",
    placement: hasSpaceBelow ? "bottom" : "top",
    style: {
      width: CARD_WIDTH,
      top,
      left,
    },
  };
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => isElementVisible(element));
}

function isTargetOutsideViewport(element: Element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top < 96 ||
    rect.bottom > window.innerHeight - 96 ||
    rect.left < 0 ||
    rect.right > window.innerWidth
  );
}

export function SpotlightCoachmark({
  steps,
  currentStepIndex,
  onNext,
  onComplete,
  onSkip,
  onTargetMissing,
}: SpotlightCoachmarkProps) {
  const step = steps[currentStepIndex];
  const [targetElement, setTargetElement] = useState<Element | null>(null);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const updateRect = useCallback((element: Element | null = targetElement) => {
    if (!element || !isElementVisible(element)) return;
    setRect(getPaddedRect(element));
  }, [targetElement]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const search = () => {
      if (cancelled) return;

      const element = findVisibleTarget(step.target);
      if (element) {
        setTargetElement(element);

        if (isTargetOutsideViewport(element)) {
          element.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "center",
            inline: "nearest",
          });
        }

        window.setTimeout(() => {
          if (!cancelled) setRect(getPaddedRect(element));
        }, prefersReducedMotion ? 0 : 280);
        return;
      }

      attempts += 1;
      if (attempts >= TARGET_RETRY_LIMIT) {
        onTargetMissing(step.id);
        return;
      }

      retryTimer = setTimeout(search, TARGET_RETRY_DELAY_MS);
    };

    search();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [onTargetMissing, prefersReducedMotion, step.id, step.target]);

  useEffect(() => {
    if (!targetElement) return;

    const handleUpdate = () => updateRect(targetElement);
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);
    window.visualViewport?.addEventListener("resize", handleUpdate);

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => handleUpdate());
    observer?.observe(targetElement);

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
      window.visualViewport?.removeEventListener("resize", handleUpdate);
      observer?.disconnect();
    };
  }, [targetElement, updateRect]);

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const timer = window.setTimeout(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusableElements = getFocusableElements(dialog);
      (focusableElements[0] ?? dialog).focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [step.id]);

  if (!step || !rect) return null;

  const cardPosition = getCardPosition(rect);
  const isLastStep = currentStepIndex >= steps.length - 1;
  const primaryAction = isLastStep ? onComplete : onNext;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onSkip();
      return;
    }

    if (event.key !== "Tab" || !dialogRef.current) return;

    const focusableElements = getFocusableElements(dialogRef.current);
    if (focusableElements.length === 0) {
      event.preventDefault();
      dialogRef.current.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none">
      <div
        className="fixed inset-x-0 top-0 bg-neutral-900/60 pointer-events-auto"
        style={{ height: rect.top }}
      />
      <div
        className="fixed left-0 bg-neutral-900/60 pointer-events-auto"
        style={{
          top: rect.top,
          width: rect.left,
          height: rect.height,
        }}
      />
      <div
        className="fixed right-0 bg-neutral-900/60 pointer-events-auto"
        style={{
          top: rect.top,
          left: rect.right,
          height: rect.height,
        }}
      />
      <div
        className="fixed inset-x-0 bottom-0 bg-neutral-900/60 pointer-events-auto"
        style={{ top: rect.bottom }}
      />

      <div
        aria-hidden="true"
        className="fixed rounded-lg border-2 border-dashed border-primary-500 transition-[top,left,width,height] duration-150 motion-reduce:transition-none"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cn(
          "fixed z-[72] pointer-events-auto rounded-lg border border-neutral-100 bg-neutral-0 p-4 shadow-lg outline-none",
          "transition-[opacity,transform] duration-150 motion-reduce:transition-none",
          cardPosition.mode === "mobile" && "max-w-none",
        )}
        style={cardPosition.style}
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-caption font-bold text-primary-700">
            {currentStepIndex + 1} / {steps.length}
          </p>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-md px-1 text-caption font-semibold text-neutral-500 transition-colors hover:text-neutral-800 focus-ring"
          >
            건너뛰기
          </button>
        </div>

        <h2 id={titleId} className="mt-2 text-title text-neutral-900">
          {step.title}
        </h2>
        <p
          id={descriptionId}
          className="mt-2 text-body-sm leading-relaxed text-neutral-600"
        >
          {step.description}
        </p>

        <div className="mt-4 flex justify-end">
          <Button type="button" size="sm" onClick={primaryAction}>
            {step.primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

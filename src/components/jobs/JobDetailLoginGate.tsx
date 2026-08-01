"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { GoogleLoginCtaButton } from "@/components/auth/GoogleLoginCtaButton";
import { Button } from "@/components/ui";

interface JobDetailLoginGateProps {
  redirectPath: string;
  triggerId: string;
}

const scrollKeys = new Set(["ArrowDown", "End", "PageDown", " "]);
export const JOB_DETAIL_LOGIN_GATE_EVENT = "staffing:job-detail-login-gate";

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("aria-hidden"));
}

function getTriggerTop(triggerId: string) {
  const trigger = document.getElementById(triggerId);
  if (!trigger) return null;

  return trigger.getBoundingClientRect().top + window.scrollY;
}

function getGateScrollThreshold(triggerId: string) {
  const triggerTop = getTriggerTop(triggerId);
  if (triggerTop === null) return null;

  return Math.max(0, triggerTop - 120);
}

function shouldOpenForScrollPosition(triggerId: string, nextScrollY = window.scrollY) {
  const threshold = getGateScrollThreshold(triggerId);
  if (threshold === null) return false;

  return nextScrollY >= threshold;
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement
    ? Boolean(
        target.closest(
          'button, a, input, select, textarea, [role="button"], [tabindex]',
        ),
      )
    : false;
}

export function openJobDetailLoginGate() {
  window.dispatchEvent(new Event(JOB_DETAIL_LOGIN_GATE_EVENT));
}

export function LoginRequiredApplyButton({
  coachmarkTarget,
}: {
  coachmarkTarget?: string;
}) {
  return (
    <Button
      size="lg"
      fullWidth
      onClick={openJobDetailLoginGate}
      data-coachmark={coachmarkTarget}
    >
      지원하기
    </Button>
  );
}

export function JobDetailLoginGate({
  redirectPath,
  triggerId,
}: JobDetailLoginGateProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const hasOpenedRef = useRef(false);
  const lockedScrollYRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);

  const openGate = useCallback((options?: { clampToTrigger?: boolean }) => {
    if (hasOpenedRef.current) return;

    if (options?.clampToTrigger) {
      const threshold = getGateScrollThreshold(triggerId);
      if (threshold !== null && window.scrollY > threshold) {
        window.scrollTo({ top: threshold, left: 0 });
      }
    }

    hasOpenedRef.current = true;
    lockedScrollYRef.current = window.scrollY;
    window.scrollTo({ top: lockedScrollYRef.current, left: 0 });
    setIsOpen(true);
  }, [triggerId]);

  useEffect(() => {
    if (isOpen) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY <= 0) return;
      const nextScrollY = window.scrollY + event.deltaY;
      if (!shouldOpenForScrollPosition(triggerId, nextScrollY)) return;

      event.preventDefault();
      openGate({ clampToTrigger: true });
    };
    const handleTouchStart = (event: TouchEvent) => {
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    };
    const handleTouchMove = (event: TouchEvent) => {
      const touchStartY = touchStartYRef.current;
      const currentY = event.touches[0]?.clientY;
      if (touchStartY === null || currentY === undefined) return;

      if (touchStartY - currentY <= 8) return;
      const nextScrollY = window.scrollY + touchStartY - currentY;
      if (!shouldOpenForScrollPosition(triggerId, nextScrollY)) return;

      event.preventDefault();
      openGate({ clampToTrigger: true });
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!scrollKeys.has(event.key)) return;
      if (isInteractiveTarget(event.target)) return;
      if (!shouldOpenForScrollPosition(triggerId, window.scrollY + 180)) {
        return;
      }

      event.preventDefault();
      openGate({ clampToTrigger: true });
    };
    const handleScroll = () => {
      if (shouldOpenForScrollPosition(triggerId)) {
        openGate({ clampToTrigger: true });
      }
    };
    const handleManualOpen = () => {
      openGate();
    };
    const listenerOptions = { passive: false, capture: true };

    window.addEventListener("wheel", handleWheel, listenerOptions);
    window.addEventListener("touchstart", handleTouchStart, listenerOptions);
    window.addEventListener("touchmove", handleTouchMove, listenerOptions);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener(JOB_DETAIL_LOGIN_GATE_EVENT, handleManualOpen);

    return () => {
      window.removeEventListener("wheel", handleWheel, listenerOptions);
      window.removeEventListener("touchstart", handleTouchStart, listenerOptions);
      window.removeEventListener("touchmove", handleTouchMove, listenerOptions);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener(JOB_DETAIL_LOGIN_GATE_EVENT, handleManualOpen);
    };
  }, [isOpen, openGate, triggerId]);

  useEffect(() => {
    if (!isOpen) return;

    const body = document.body;
    const documentElement = document.documentElement;
    const previousBodyStyles = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    const previousDocumentOverflow = documentElement.style.overflow;
    const lockedScrollY = lockedScrollYRef.current;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${lockedScrollY}px`;
    body.style.width = "100%";
    documentElement.style.overflow = "hidden";

    requestAnimationFrame(() => {
      getFocusableElements(dialogRef.current ?? document.body)[0]?.focus();
    });

    return () => {
      body.style.overflow = previousBodyStyles.overflow;
      body.style.position = previousBodyStyles.position;
      body.style.top = previousBodyStyles.top;
      body.style.width = previousBodyStyles.width;
      documentElement.style.overflow = previousDocumentOverflow;
      window.scrollTo({ top: lockedScrollY, left: 0 });
    };
  }, [isOpen]);

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key !== "Tab") return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableElements = getFocusableElements(dialog);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);
    if (!firstElement || !lastElement) return;

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-neutral-900/55 px-4 py-6 sm:items-center"
      onWheel={(event) => event.preventDefault()}
      onTouchMove={(event) => event.preventDefault()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-detail-login-gate-title"
        aria-describedby="job-detail-login-gate-description"
        className="w-full max-w-sm rounded-md bg-neutral-0 p-5 shadow-lg"
        onKeyDown={handleDialogKeyDown}
      >
        <h2
          id="job-detail-login-gate-title"
          className="text-title text-neutral-900"
        >
          로그인하고 모집글을 확인해보세요
        </h2>
        <p
          id="job-detail-login-gate-description"
          className="mt-2 text-body-sm leading-relaxed text-neutral-600"
        >
          로그인하면 근무 조건과 게스트하우스 상세 정보를 모두 확인할 수 있어요.
        </p>
        <div className="mt-5 grid gap-2">
          <GoogleLoginCtaButton
            className="w-full"
            ctaLocation="job_detail_scroll_gate"
            loadingText="로그인으로 이동 중..."
            redirectPath={redirectPath}
          >
            Google로 시작하기
          </GoogleLoginCtaButton>
          <Button
            type="button"
            variant="outline"
            size="lg"
            fullWidth
            onClick={() => router.push("/jobs")}
          >
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
}

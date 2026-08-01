"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { Button } from "@/components/ui";

interface JobDetailLoginGateProps {
  redirectPath: string;
}

const scrollKeys = new Set(["ArrowDown", "End", "PageDown", " "]);

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("aria-hidden"));
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

export function JobDetailLoginGate({ redirectPath }: JobDetailLoginGateProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const hasOpenedRef = useRef(false);
  const lockedScrollYRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);

  const openGate = useCallback(() => {
    if (hasOpenedRef.current) return;

    hasOpenedRef.current = true;
    lockedScrollYRef.current = window.scrollY;
    window.scrollTo({ top: lockedScrollYRef.current, left: 0 });
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (isOpen) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY <= 0) return;

      event.preventDefault();
      openGate();
    };
    const handleTouchStart = (event: TouchEvent) => {
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    };
    const handleTouchMove = (event: TouchEvent) => {
      const touchStartY = touchStartYRef.current;
      const currentY = event.touches[0]?.clientY;
      if (touchStartY === null || currentY === undefined) return;

      if (touchStartY - currentY <= 8) return;

      event.preventDefault();
      openGate();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!scrollKeys.has(event.key)) return;
      if (isInteractiveTarget(event.target)) return;

      event.preventDefault();
      openGate();
    };
    const listenerOptions = { passive: false, capture: true };

    window.addEventListener("wheel", handleWheel, listenerOptions);
    window.addEventListener("touchstart", handleTouchStart, listenerOptions);
    window.addEventListener("touchmove", handleTouchMove, listenerOptions);
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("wheel", handleWheel, listenerOptions);
      window.removeEventListener("touchstart", handleTouchStart, listenerOptions);
      window.removeEventListener("touchmove", handleTouchMove, listenerOptions);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, openGate]);

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
          근무 조건과 게스트하우스 상세 정보는 로그인 후 확인할 수 있어요.
        </p>
        <div className="mt-5 grid gap-2">
          <GoogleLoginButton
            ctaLocation="job_detail_scroll_gate"
            loadingText="로그인으로 이동 중..."
            redirectPath={redirectPath}
          >
            로그인하고 계속 보기
          </GoogleLoginButton>
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

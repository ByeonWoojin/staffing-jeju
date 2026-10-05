"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui";

// 2줄 가로 스크롤 캐러셀. 한 화면에 (열 수 × 2줄) 개가 보이고, 좌우 버튼은 한 화면(페이지) 단위로 넘긴다.
// 카드는 서버에서 렌더해 children 으로 받는다. 이 컴포넌트는 스크롤 위치와 버튼 상태만 담당한다.
function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === "left" ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
    </svg>
  );
}

export function JobsCarousel({ heading, children }: { heading: ReactNode; children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [{ canPrev, canNext }, setState] = useState({ canPrev: false, canNext: false });

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setState({ canPrev: el.scrollLeft > 4, canNext: el.scrollLeft < max - 4 });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update]);

  const scrollByPage = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: direction * (el.clientWidth + 20), behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">{heading}</div>
        {/* 넘길 내용이 있을 때만 좌우 버튼을 보여준다 */}
        {(canPrev || canNext) && (
          <div className="hidden shrink-0 gap-2 sm:flex">
            <Button variant="outline" size="sm" className="size-9 rounded-full px-0" aria-label="이전 모집글 보기" disabled={!canPrev} onClick={() => scrollByPage(-1)}>
              <Chevron direction="left" />
            </Button>
            <Button variant="outline" size="sm" className="size-9 rounded-full px-0" aria-label="다음 모집글 보기" disabled={!canNext} onClick={() => scrollByPage(1)}>
              <Chevron direction="right" />
            </Button>
          </div>
        )}
      </div>
      <div
        ref={trackRef}
        className="grid snap-x snap-mandatory auto-cols-[82%] grid-flow-col grid-rows-2 gap-x-5 gap-y-7 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:none] sm:auto-cols-[calc((100%_-_1.25rem)/2)] lg:auto-cols-[calc((100%_-_2.5rem)/3)] xl:auto-cols-[calc((100%_-_3.75rem)/4)] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}

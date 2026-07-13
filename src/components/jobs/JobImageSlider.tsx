"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { TouchEvent } from "react";

export interface JobImageSlide {
  id: string;
  url: string;
  altText: string;
}

interface JobImageSliderProps {
  images: JobImageSlide[];
  fallbackAlt: string;
}

const AUTO_ROLLING_INTERVAL_MS = 4500;
const SWIPE_THRESHOLD_PX = 44;

export function JobImageSlider({ images, fallbackAlt }: JobImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [interactionKey, setInteractionKey] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    if (!hasMultipleImages || isPaused || prefersReducedMotion) return;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setCurrentIndex((index) => (index + 1) % images.length);
    }, AUTO_ROLLING_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasMultipleImages, images.length, interactionKey, isPaused, prefersReducedMotion]);

  if (images.length === 0) return null;

  const moveTo = (nextIndex: number) => {
    setCurrentIndex((nextIndex + images.length) % images.length);
    setInteractionKey((key) => key + 1);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (!hasMultipleImages) return;

    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (startX === null || startY === null) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    if (
      Math.abs(deltaX) < SWIPE_THRESHOLD_PX ||
      Math.abs(deltaX) < Math.abs(deltaY)
    ) {
      return;
    }

    moveTo(deltaX < 0 ? currentIndex + 1 : currentIndex - 1);
  };

  return (
    <div
      className="relative aspect-[16/9] overflow-hidden rounded-md bg-neutral-100"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {images.map((image, index) => (
        <Image
          key={image.id}
          src={image.url}
          alt={image.altText || fallbackAlt}
          fill
          priority={index === 0}
          sizes="(min-width: 1024px) 720px, 100vw"
          className={`object-cover transition-opacity duration-500 ease-out motion-reduce:transition-none ${
            index === currentIndex ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {hasMultipleImages && (
        <>
          <button
            type="button"
            aria-label="이전 이미지"
            onClick={() => moveTo(currentIndex - 1)}
            className="absolute left-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-0/80 text-neutral-900 shadow-sm backdrop-blur transition-colors hover:bg-neutral-0 focus-ring"
          >
            <span aria-hidden="true" className="text-[28px] leading-none">
              ‹
            </span>
          </button>
          <button
            type="button"
            aria-label="다음 이미지"
            onClick={() => moveTo(currentIndex + 1)}
            className="absolute right-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-0/80 text-neutral-900 shadow-sm backdrop-blur transition-colors hover:bg-neutral-0 focus-ring"
          >
            <span aria-hidden="true" className="text-[28px] leading-none">
              ›
            </span>
          </button>

          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-2 px-4">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                aria-label={`${index + 1}번째 이미지 보기`}
                aria-current={index === currentIndex ? "true" : undefined}
                onClick={() => moveTo(index)}
                className={`size-2.5 rounded-full transition-colors focus-ring ${
                  index === currentIndex
                    ? "bg-primary-500"
                    : "bg-neutral-0/70 hover:bg-neutral-0"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

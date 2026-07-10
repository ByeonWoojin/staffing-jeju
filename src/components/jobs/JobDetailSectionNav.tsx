"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

export interface JobDetailSectionNavItem {
  id: string;
  label: string;
  visible: boolean;
}

interface JobDetailSectionNavProps {
  sections: JobDetailSectionNavItem[];
}

export function JobDetailSectionNav({ sections }: JobDetailSectionNavProps) {
  const visibleSections = useMemo(
    () => sections.filter((section) => section.visible),
    [sections],
  );
  const [activeSection, setActiveSection] = useState(
    visibleSections[0]?.id ?? "",
  );

  useEffect(() => {
    if (visibleSections.length === 0) return;

    const elements = visibleSections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry?.target.id) {
          setActiveSection(visibleEntry.target.id);
        }
      },
      {
        rootMargin: "-96px 0px -55% 0px",
        threshold: [0.1, 0.35, 0.6],
      },
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [visibleSections]);

  if (visibleSections.length === 0) return null;

  return (
    <nav
      aria-label="상세 정보 섹션"
      className="max-w-full border-y border-neutral-100 py-2"
    >
      <div className="flex max-w-full flex-wrap gap-2">
        {visibleSections.map((section) => {
          const isActive = activeSection === section.id;

          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={isActive ? "location" : undefined}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "rounded-pill border px-3 py-1.5 text-body-sm font-semibold transition-colors focus-ring",
                isActive
                  ? "border-primary-100 bg-primary-50 text-primary-700"
                  : "border-transparent text-neutral-600 hover:bg-neutral-100 hover:text-primary-700",
              )}
            >
              {section.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

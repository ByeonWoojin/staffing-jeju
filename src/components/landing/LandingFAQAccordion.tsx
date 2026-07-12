"use client";

import { useId, useState } from "react";

export interface FAQItem {
  question: string;
  answer: string;
}

interface LandingFAQAccordionProps {
  items: FAQItem[];
}

export function LandingFAQAccordion({ items }: LandingFAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const idPrefix = useId();

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const buttonId = `${idPrefix}-faq-button-${index}`;
        const panelId = `${idPrefix}-faq-panel-${index}`;

        return (
          <div
            key={item.question}
            className={`overflow-hidden rounded-2xl border bg-neutral-0 shadow-[0_8px_18px_rgba(31,31,31,0.035)] transition-colors duration-200 ${
              isOpen ? "border-primary-200" : "border-primary-100/80"
            }`}
          >
            <button
              id={buttonId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className={`grid min-h-[64px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-[18px] text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF8] md:min-h-[72px] md:gap-4 md:px-7 md:py-6 ${
                isOpen ? "bg-[#FFF3E8]" : "bg-[#FFF8F1] hover:bg-primary-50"
              }`}
            >
              <span className="text-[16px] font-extrabold leading-none text-primary-500 md:text-[19px]">
                Q.
              </span>
              <span className="min-w-0 pr-2 text-[16px] font-extrabold leading-[1.35] text-[#1F1F1F] md:text-[19px]">
                {item.question}
              </span>
              <span
                aria-hidden="true"
                className={`flex size-5 shrink-0 items-center justify-center text-primary-500 transition-transform duration-300 motion-reduce:transition-none ${
                  isOpen ? "rotate-180" : "rotate-0"
                }`}
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="size-5"
                  focusable="false"
                >
                  <path
                    d="M5 7.5L10 12.5L15 7.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              aria-hidden={!isOpen}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                isOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="border-t border-primary-100 bg-neutral-0 px-5 py-5 md:px-7 md:py-6">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-l-2 border-primary-200 pl-4 md:gap-4 md:pl-5">
                    <span className="pt-0.5 text-[15px] font-extrabold leading-7 text-primary-500 md:text-[16px]">
                      A.
                    </span>
                    <p className="text-[14px] font-medium leading-[1.75] text-neutral-600 md:text-[16px] md:leading-[1.8]">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

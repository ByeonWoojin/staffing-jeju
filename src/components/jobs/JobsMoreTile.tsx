import Image from "next/image";
import Link from "next/link";

// 캐러셀 마지막 칸의 "전체보기" 타일. 대표 사진 최대 3장을 겹쳐 보여주고 눈에 띄는 색으로 강조한다.
export const ARROW_PATH = "M5 12h14m-6-6 6 6-6 6";

const LAYOUT = ["left-[8%] top-[14%] w-[54%] -rotate-6", "right-[8%] top-[10%] w-[54%] rotate-5", "left-[24%] bottom-[8%] w-[54%] -rotate-1"];

export function JobsMoreTile({
  href,
  thumbnails,
  ariaLabel,
  caption,
}: {
  href: string;
  thumbnails: Array<string | null | undefined>;
  ariaLabel: string;
  caption: string;
}) {
  const images = thumbnails.filter((url): url is string => Boolean(url)).slice(0, 3);

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="group flex h-full min-h-full flex-col overflow-hidden rounded-md border border-primary-200 bg-primary-50 p-4 shadow-sm transition-colors duration-150 hover:border-primary-300 hover:bg-primary-100/70 focus-ring md:p-5"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-primary-100/70">
        {images.map((url, index) => (
          <div key={url} className={`absolute aspect-[4/3] overflow-hidden rounded-md shadow-md ring-2 ring-white transition-transform duration-300 group-hover:scale-[1.03] ${LAYOUT[index]}`} style={{ zIndex: index }}>
            <Image src={url} alt="" fill className="object-cover" sizes="160px" />
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-end justify-between gap-3 pt-4 md:pt-5">
        <div className="min-w-0">
          <p className="text-[20px] font-bold leading-7 text-primary-700">전체보기</p>
          <p className="mt-1 text-caption font-semibold text-primary-700/80">{caption}</p>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white shadow-sm transition-transform duration-150 group-hover:translate-x-0.5">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={ARROW_PATH} />
          </svg>
        </span>
      </div>
    </Link>
  );
}

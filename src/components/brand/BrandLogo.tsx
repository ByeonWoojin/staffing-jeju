import Image from "next/image";
import { cn } from "@/lib/cn";

const sizeStyles = {
  sm: "h-7",
  md: "h-8",
  lg: "h-10",
} as const;

interface BrandLogoProps {
  className?: string;
  priority?: boolean;
  size?: keyof typeof sizeStyles;
}

export function BrandLogo({
  className,
  priority = false,
  size = "md",
}: BrandLogoProps) {
  return (
    <Image
      src="/images/brand/staffing-logo.png"
      alt="제주도 게스트하우스 스탭 모집 플랫폼 스탭핑"
      width={1792}
      height={878}
      priority={priority}
      sizes="(min-width: 768px) 112px, 88px"
      className={cn("w-auto object-contain", sizeStyles[size], className)}
    />
  );
}

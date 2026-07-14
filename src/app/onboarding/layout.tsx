import { privatePageMetadata } from "@/lib/seo/private-metadata";

export const metadata = privatePageMetadata;

export default function OnboardingRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

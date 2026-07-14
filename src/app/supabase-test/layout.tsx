import { privatePageMetadata } from "@/lib/seo/private-metadata";

export const metadata = privatePageMetadata;

export default function SupabaseTestRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

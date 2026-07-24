import { createSitemapResponse } from "@/lib/seo/sitemap-xml";

export const dynamic = "force-dynamic";

export async function GET() {
  return createSitemapResponse();
}

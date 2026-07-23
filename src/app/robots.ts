import type { MetadataRoute } from "next";

const SITE_URL = "https://staffing-jeju.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/owner", "/staff/applications", "/staff/favorites", "/auth", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

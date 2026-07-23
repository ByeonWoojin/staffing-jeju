import type { MetadataRoute } from "next";

const SITE_URL = "https://staffing-jeju.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/jobs`,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}

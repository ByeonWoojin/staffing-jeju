import type { MetadataRoute } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { JobPost } from "@/types/database";

const SITE_URL = "https://staffing-jeju.vercel.app";

export const revalidate = 3600;

type SitemapJobPost = Pick<JobPost, "slug" | "updated_at">;

const staticRoutes: MetadataRoute.Sitemap = [
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

async function getPublicJobPostRoutes(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("job_posts")
      .select("slug, updated_at")
      .neq("status", "hidden")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[sitemap] public job post lookup failed", {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return [];
    }

    const routes: MetadataRoute.Sitemap = [];
    for (const jobPost of (data ?? []) as SitemapJobPost[]) {
      const slug = jobPost.slug.trim();
      if (!slug) continue;

      routes.push({
        url: `${SITE_URL}/jobs/${encodeURIComponent(slug)}`,
        lastModified: new Date(jobPost.updated_at),
        changeFrequency: "daily",
        priority: 0.8,
      });
    }

    return routes;
  } catch (error) {
    console.error("[sitemap] public job post routes fallback", {
      message: error instanceof Error ? error.message : "Unknown sitemap error",
    });
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const jobPostRoutes = await getPublicJobPostRoutes();
  return [...staticRoutes, ...jobPostRoutes];
}

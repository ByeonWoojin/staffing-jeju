import { createClient } from "@supabase/supabase-js";

const SITE_URL = "https://staffing-jeju.vercel.app";
const CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";

export const dynamic = "force-dynamic";

type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq: "daily" | "weekly";
  priority: number;
};

type PublicJobPostSitemapRow = {
  slug: string | null;
  updated_at: string | null;
};

const staticEntries: SitemapEntry[] = [
  {
    loc: SITE_URL,
    changefreq: "weekly",
    priority: 1,
  },
  {
    loc: `${SITE_URL}/jobs`,
    changefreq: "daily",
    priority: 0.9,
  },
];

function createSupabaseAnonClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase anon 환경변수가 설정되지 않았습니다.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatLastModified(value: string | null) {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toISOString();
}

async function getPublicJobPostEntries(): Promise<SitemapEntry[]> {
  try {
    const supabase = createSupabaseAnonClient();
    const { data, error } = await supabase
      .from("job_posts")
      .select("slug, updated_at")
      .in("status", ["open", "closed"])
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[sitemap.xml] public job post lookup failed", {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return [];
    }

    return ((data ?? []) as PublicJobPostSitemapRow[]).flatMap((jobPost) => {
      const slug = jobPost.slug?.trim();
      if (!slug) return [];

      return [
        {
          loc: `${SITE_URL}/jobs/${encodeURIComponent(slug)}`,
          lastmod: formatLastModified(jobPost.updated_at),
          changefreq: "daily",
          priority: 0.8,
        },
      ];
    });
  } catch (error) {
    console.error("[sitemap.xml] public job post routes fallback", {
      message: error instanceof Error ? error.message : "Unknown sitemap error",
    });
    return [];
  }
}

function createSitemapXml(entries: SitemapEntry[]) {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastmod
        ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`
        : "";

      return `  <url>
    <loc>${escapeXml(entry.loc)}</loc>${lastmod}
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export async function GET() {
  const jobPostEntries = await getPublicJobPostEntries();
  const xml = createSitemapXml([...staticEntries, ...jobPostEntries]);

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}

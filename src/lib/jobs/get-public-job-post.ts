import "server-only";

import { cache } from "react";
import { getPublicJobBySlug } from "@/lib/public-job-data";

export const getPublicJobPostBySlug = cache(async (slug: string) =>
  getPublicJobBySlug(slug),
);

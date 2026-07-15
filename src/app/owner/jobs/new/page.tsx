import { redirect } from "next/navigation";
import {
  getCurrentJobPost,
  getCurrentOwner,
  getOwnerGuesthouse,
} from "@/lib/owner-supabase-data";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const owner = await getCurrentOwner();
  const [guesthouse, existingJobPost] = await Promise.all([
    getOwnerGuesthouse(owner.id),
    getCurrentJobPost(owner.id),
  ]);

  if (!guesthouse) {
    redirect("/onboarding/owner/guesthouse");
  }
  if (existingJobPost) {
    redirect(`/owner/jobs/${existingJobPost.id}/edit`);
  }

  redirect("/onboarding/owner/job-post");
}

import { redirect } from "next/navigation";
import { getCurrentOwner, getOwnerGuesthouse } from "@/lib/owner-supabase-data";

export const dynamic = "force-dynamic";

export default async function NewGuesthousePage() {
  const owner = await getCurrentOwner();
  const guesthouse = await getOwnerGuesthouse(owner.id);

  if (guesthouse) {
    redirect("/owner/guesthouse/edit");
  }

  redirect("/onboarding/owner/guesthouse");
}

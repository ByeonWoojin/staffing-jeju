import { redirect } from "next/navigation";
import {
  getCurrentAuthUser,
  getPostLoginDestination,
} from "@/lib/auth/onboarding";

export const dynamic = "force-dynamic";

export default async function OwnerRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentAuthUser();
  if (!user) {
    redirect("/");
  }

  const destination = await getPostLoginDestination(user.id);
  if (
    destination !== "/owner" &&
    destination !== "/onboarding/owner/job-post"
  ) {
    redirect(destination);
  }

  return children;
}

import { redirect } from "next/navigation";
import { getCurrentUserDestination } from "@/lib/auth/onboarding";
import { LandingPage } from "@/components/landing/LandingPage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { user, destination } = await getCurrentUserDestination();

  if (user && destination !== "/") {
    redirect(destination);
  }

  return <LandingPage />;
}

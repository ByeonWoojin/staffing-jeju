import { redirect } from "next/navigation";
import { OwnerAccountProvider } from "@/components/auth/OwnerAccountMenu";
import {
  getCurrentAuthUser,
  getProfileById,
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

  const profile = await getProfileById(user.id);
  const destination = await getPostLoginDestination(user.id);
  if (
    destination !== "/owner" &&
    destination !== "/onboarding/owner/job-post"
  ) {
    redirect(destination);
  }

  return (
    <OwnerAccountProvider
      account={{
        name:
          typeof profile?.name === "string" && profile.name.trim()
            ? profile.name
            : null,
        email: user.email ?? profile?.email ?? null,
      }}
    >
      {children}
    </OwnerAccountProvider>
  );
}

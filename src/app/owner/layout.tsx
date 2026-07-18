import { redirect } from "next/navigation";
import { OwnerAccountProvider } from "@/components/auth/OwnerAccountMenu";
import { RoleCoachmarkController } from "@/components/onboarding/RoleCoachmarkController";
import {
  getCurrentAuthUser,
  getProfileById,
  getPostLoginDestination,
} from "@/lib/auth/onboarding";
import { privatePageMetadata } from "@/lib/seo/private-metadata";

export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata;

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
      <RoleCoachmarkController role="owner" />
      {children}
    </OwnerAccountProvider>
  );
}

import "server-only";

import { redirect } from "next/navigation";
import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Guesthouse, GuesthousePhoto, JobPost, Profile } from "@/types/database";

export interface StaffFavoriteGuesthouseItem {
  guesthouse: Guesthouse;
  currentJobPost: JobPost | null;
  imageUrl: string | null;
}

export interface StaffFavoritesData {
  profile: Profile;
  items: StaffFavoriteGuesthouseItem[];
  authorized: boolean;
}

function getGuesthousePhotoUrl(path: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = supabase.storage.from("guesthouse-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function getStaffFavoritesData(): Promise<StaffFavoritesData> {
  const user = await getCurrentAuthUser();
  if (!user) redirect("/");

  const profile = await getProfileById(user.id);
  if (!profile) redirect("/onboarding/role");
  if (profile.role !== "staff") {
    return { profile, items: [], authorized: false };
  }

  const supabase = createSupabaseAdminClient();
  const { data: favorites, error: favoriteError } = await supabase
    .from("staff_favorite_guesthouses")
    .select("guesthouse_id")
    .eq("staff_id", profile.id)
    .order("created_at", { ascending: false });

  if (favoriteError) {
    console.error("[staff-favorite-data] favorites lookup failed", {
      message: favoriteError.message,
      code: favoriteError.code,
      details: favoriteError.details,
    });
    return { profile, items: [], authorized: true };
  }

  const guesthouseIds = (favorites ?? []).map(
    (favorite) => favorite.guesthouse_id as string,
  );
  if (guesthouseIds.length === 0) {
    return { profile, items: [], authorized: true };
  }

  const [
    { data: guesthouses, error: guesthouseError },
    { data: jobPosts, error: jobPostError },
    { data: photos, error: photoError },
  ] = await Promise.all([
    supabase.from("guesthouses").select("*").in("id", guesthouseIds),
    supabase
      .from("job_posts")
      .select("*")
      .in("guesthouse_id", guesthouseIds)
      .eq("status", "open")
      .order("is_urgent", { ascending: false })
      .order("bumped_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("guesthouse_photos")
      .select("*")
      .in("guesthouse_id", guesthouseIds)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (guesthouseError || jobPostError || photoError) {
    console.error("[staff-favorite-data] relation lookup failed", {
      guesthouseError,
      jobPostError,
      photoError,
    });
    return { profile, items: [], authorized: true };
  }

  const guesthouseById = new Map(
    ((guesthouses ?? []) as Guesthouse[]).map((guesthouse) => [
      guesthouse.id,
      guesthouse,
    ]),
  );
  const jobPostByGuesthouseId = new Map<string, JobPost>();
  for (const jobPost of (jobPosts ?? []) as JobPost[]) {
    if (!jobPostByGuesthouseId.has(jobPost.guesthouse_id)) {
      jobPostByGuesthouseId.set(jobPost.guesthouse_id, jobPost);
    }
  }
  const photoByGuesthouseId = new Map<string, GuesthousePhoto>();
  for (const photo of (photos ?? []) as GuesthousePhoto[]) {
    if (!photoByGuesthouseId.has(photo.guesthouse_id)) {
      photoByGuesthouseId.set(photo.guesthouse_id, photo);
    }
  }

  return {
    profile,
    authorized: true,
    items: guesthouseIds.flatMap((guesthouseId) => {
      const guesthouse = guesthouseById.get(guesthouseId);
      if (!guesthouse) return [];
      const photo = photoByGuesthouseId.get(guesthouseId);

      return [
        {
          guesthouse,
          currentJobPost: jobPostByGuesthouseId.get(guesthouseId) ?? null,
          imageUrl: photo ? getGuesthousePhotoUrl(photo.photo_path) : null,
        },
      ];
    }),
  };
}

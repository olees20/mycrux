import "server-only";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import type { AppSupabaseClient, GymRole } from "@/lib/supabase/types";
import { normalizeDatabaseError } from "./errors";
import {
  chooseAccessibleGym,
  gymPath,
  type AccessibleGym,
} from "./gym-context-core";
import { logger } from "./logger";
import { requireUser } from "./authorization";

export const ACTIVE_GYM_COOKIE = "crux-active-gym";

export async function listAccessibleGyms(
  profileId: string,
  client?: AppSupabaseClient,
): Promise<AccessibleGym[]> {
  const supabase = client ?? await createServerComponentSupabaseClient();
  const { data: memberships, error: membershipError } = await supabase
    .from("gym_memberships")
    .select("id,gym_id,role")
    .eq("profile_id", profileId)
    .eq("status", "active")
    .order("created_at");

  if (membershipError) {
    logger.write({ level: "error", event: "accessible_gym_memberships_failed", context: { profileId }, error: membershipError });
    throw normalizeDatabaseError(membershipError, "Gym access could not be verified");
  }
  if (!memberships.length) return [];

  const { data: gyms, error: gymError } = await supabase
    .from("gyms")
    .select("id,slug,name")
    .in("id", memberships.map(({ gym_id }) => gym_id))
    .is("archived_at", null)
    .in("status", ["trial", "active", "past_due"]);

  if (gymError) {
    logger.write({ level: "error", event: "accessible_gyms_failed", context: { profileId }, error: gymError });
    throw normalizeDatabaseError(gymError, "Gym access could not be verified");
  }

  const gymsById = new Map(gyms.map((gym) => [gym.id, gym]));
  return memberships.flatMap((membership) => {
    const gym = gymsById.get(membership.gym_id);
    return gym ? [{
      id: gym.id,
      slug: gym.slug,
      name: gym.name,
      membershipId: membership.id,
      role: membership.role as GymRole,
    }] : [];
  });
}

export async function requireActiveGymContext(options?: Readonly<{
  gymSlug?: string;
  allowedRoles?: readonly GymRole[];
  client?: AppSupabaseClient;
}>): Promise<Readonly<{ gym: AccessibleGym; gyms: AccessibleGym[] }>> {
  const supabase = options?.client ?? await createServerComponentSupabaseClient();
  const user = await requireUser({ redirectTo: "/app", client: supabase });

  const gyms = await listAccessibleGyms(user.id, supabase);
  if (!gyms.length) redirect("/onboarding");

  const cookieStore = await cookies();
  const gym = chooseAccessibleGym(gyms, {
    slug: options?.gymSlug,
    preferredGymId: cookieStore.get(ACTIVE_GYM_COOKIE)?.value,
    allowedRoles: options?.allowedRoles,
  });

  if (!gym) {
    if (options?.gymSlug) notFound();
    redirect(gymPath(gyms[0]));
  }

  return { gym, gyms };
}

export async function redirectToActiveGym(
  destination = "/app",
  allowedRoles?: readonly GymRole[],
): Promise<never> {
  const { gym } = await requireActiveGymContext({ allowedRoles });
  redirect(gymPath(gym, destination));
}

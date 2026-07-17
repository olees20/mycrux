import { z } from "zod";
import type { GymRole } from "@/lib/supabase/types";

export const gymSlugSchema = z.string().trim().toLowerCase().regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  "A valid gym slug is required",
);

export type AccessibleGym = Readonly<{
  id: string;
  slug: string;
  name: string;
  membershipId: string;
  role: GymRole;
}>;

export type GymLocator =
  | Readonly<{ kind: "slug"; value: string }>
  | Readonly<{ kind: "custom-domain"; value: string }>;

export function slugLocator(value: string): GymLocator {
  return { kind: "slug", value: gymSlugSchema.parse(value) };
}

export function chooseAccessibleGym(
  gyms: readonly AccessibleGym[],
  options: Readonly<{ slug?: string; preferredGymId?: string; allowedRoles?: readonly GymRole[] }>,
): AccessibleGym | null {
  const permitted = options.allowedRoles?.length
    ? gyms.filter((gym) => options.allowedRoles?.includes(gym.role))
    : gyms;

  if (options.slug !== undefined) {
    const slug = gymSlugSchema.parse(options.slug);
    return permitted.find((gym) => gym.slug === slug) ?? null;
  }

  return permitted.find((gym) => gym.id === options.preferredGymId) ?? permitted[0] ?? null;
}

export function gymPath(gym: Pick<AccessibleGym, "slug">, destination = "/app") {
  const safeDestination = destination.startsWith("/") && !destination.startsWith("//")
    ? destination
    : "/app";
  return `/g/${gym.slug}${safeDestination}`;
}

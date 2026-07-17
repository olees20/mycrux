import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import type { AppSupabaseClient, GymRole } from "@/lib/supabase/types";
import { UnauthenticatedError, normalizeDatabaseError } from "./errors";
import {
  assertActiveMembership,
  validateGymId,
  type ActiveMembership,
} from "./authorization-core";
import { logger } from "./logger";

const safeRedirectPath = z.string().regex(/^\/(?!\/)/).default("/app");

export { assertActiveMembership, validateGymId, type ActiveMembership };

export async function getVerifiedUser(client?: AppSupabaseClient): Promise<User | null> {
  const supabase = client ?? await createServerComponentSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    logger.write({ level: "warn", event: "auth_user_verification_failed", error });
    return null;
  }

  return data.user;
}

export async function requireUser(options?: {
  redirectTo?: string;
  client?: AppSupabaseClient;
}): Promise<User> {
  const user = await getVerifiedUser(options?.client);
  if (user) return user;

  const redirectTo = safeRedirectPath.parse(options?.redirectTo ?? "/app");
  redirect(`/login?next=${encodeURIComponent(redirectTo)}`);
}

export async function requireRouteUser(client?: AppSupabaseClient): Promise<User> {
  const user = await getVerifiedUser(client);
  if (!user) throw new UnauthenticatedError();
  return user;
}

export async function requireGymMembership(
  gymId: string,
  allowedRoles?: readonly GymRole[],
  client?: AppSupabaseClient,
): Promise<ActiveMembership> {
  const validatedGymId = validateGymId(gymId);
  const supabase = client ?? await createServerComponentSupabaseClient();
  const user = await requireRouteUser(supabase);
  const { data, error } = await supabase
    .from("gym_memberships")
    .select("*")
    .eq("gym_id", validatedGymId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error) {
    logger.write({
      level: "error",
      event: "membership_lookup_failed",
      context: { gymId: validatedGymId, profileId: user.id },
      error,
    });
    throw normalizeDatabaseError(error, "The gym membership could not be verified");
  }

  assertActiveMembership(data, allowedRoles);
  return data;
}

export function requireGymRole(
  gymId: string,
  roles: readonly GymRole[],
  client?: AppSupabaseClient,
) {
  return requireGymMembership(gymId, roles, client);
}

export async function requirePageMembership(allowedRoles?: readonly GymRole[]) {
  const supabase = await createServerComponentSupabaseClient();
  const user = await requireUser({ redirectTo: "/app", client: supabase });
  if (!user.email_confirmed_at) redirect("/verify-email");

  let query = supabase
    .from("gym_memberships")
    .select("*")
    .eq("profile_id", user.id)
    .eq("status", "active");

  if (allowedRoles?.length) query = query.in("role", [...allowedRoles]);
  const { data, error } = await query.limit(1).maybeSingle();

  if (error) {
    logger.write({ level: "error", event: "page_membership_lookup_failed", context: { profileId: user.id }, error });
    throw normalizeDatabaseError(error, "The active gym could not be verified");
  }
  if (!data) {
    if (allowedRoles?.length) redirect("/app");
    redirect("/onboarding");
  }

  return data as ActiveMembership;
}

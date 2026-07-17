import { z } from "zod";
import type { Tables } from "@/lib/supabase/database.types";
import type { GymRole } from "@/lib/supabase/types";
import { ForbiddenError } from "./errors";

export type ActiveMembership = Tables<"gym_memberships"> & { status: "active" };

const gymIdSchema = z.uuid("A valid gym ID is required");

export function assertActiveMembership(
  membership: Tables<"gym_memberships"> | null,
  allowedRoles?: readonly GymRole[],
): asserts membership is ActiveMembership {
  if (!membership || membership.status !== "active") {
    throw new ForbiddenError("An active gym membership is required");
  }

  if (allowedRoles && !allowedRoles.includes(membership.role as GymRole)) {
    throw new ForbiddenError("Your gym role does not permit this action");
  }
}

export function validateGymId(value: string) {
  return gymIdSchema.parse(value);
}

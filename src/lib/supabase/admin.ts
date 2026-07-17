import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getServerEnvironment } from "@/env/server";
import { normalizeDatabaseError } from "@/lib/server/errors";
import { logger } from "@/lib/server/logger";
import type { Database } from "./database.types";
import { gymBrandingSchema, gymDetailsSchema, type GymBranding, type GymDetails } from "@/features/gyms/validation";

const sha256Hash = z.string().regex(/^[a-f0-9]{64}$/, "Expected a SHA-256 hash");

function createPrivilegedSupabaseClient() {
  const environment = getServerEnvironment();
  return createClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { "X-Client-Info": "crux-server-admin" } },
    },
  );
}

function validateHash(hash: string) {
  return sha256Hash.parse(hash);
}

async function findInvitationByTokenHash(hash: string) {
  const client = createPrivilegedSupabaseClient();
  const { data, error } = await client
    .from("invitations")
    .select("*")
    .eq("token_hash", validateHash(hash))
    .maybeSingle();

  if (error) {
    logger.write({ level: "error", event: "privileged_token_lookup_failed", context: { table: "invitations" }, error });
    throw normalizeDatabaseError(error, "The signed access lookup failed");
  }

  return data;
}

async function findGuestInviteByTokenHash(hash: string) {
  const client = createPrivilegedSupabaseClient();
  const { data, error } = await client
    .from("guest_invites")
    .select("*")
    .eq("token_hash", validateHash(hash))
    .maybeSingle();

  if (error) {
    logger.write({ level: "error", event: "privileged_token_lookup_failed", context: { table: "guest_invites" }, error });
    throw normalizeDatabaseError(error, "The signed access lookup failed");
  }

  return data;
}

async function findPassByReferenceHash(hash: string) {
  const validatedHash = sha256Hash.parse(hash);
  const client = createPrivilegedSupabaseClient();
  const { data, error } = await client
    .from("passes")
    .select("*")
    .eq("reference_code_hash", validatedHash)
    .maybeSingle();

  if (error) {
    logger.write({ level: "error", event: "privileged_token_lookup_failed", context: { table: "passes" }, error });
    throw normalizeDatabaseError(error, "The signed access lookup failed");
  }

  return data;
}

async function createGymTenant(input: {
  actorProfileId: string;
  ownerProfileId: string;
  details: GymDetails;
  branding: GymBranding;
}) {
  const client = createPrivilegedSupabaseClient();
  const details = gymDetailsSchema.parse(input.details);
  const branding = gymBrandingSchema.parse(input.branding);
  const { data, error } = await client.rpc("create_gym_tenant", {
    actor_profile_id: z.uuid().parse(input.actorProfileId),
    owner_profile_id: z.uuid().parse(input.ownerProfileId),
    configuration: details,
    branding,
  });
  if (error) {
    logger.write({ level: "error", event: "privileged_gym_creation_failed", context: { actorProfileId: input.actorProfileId }, error });
    throw normalizeDatabaseError(error, "The gym could not be created");
  }
  return data;
}

async function processDueAnnouncements() {
  const client = createPrivilegedSupabaseClient();
  const { data, error } = await client.rpc("process_due_announcements");
  if (error) {
    logger.write({ level: "error", event: "due_announcement_processing_failed", error });
    throw normalizeDatabaseError(error, "Due announcements could not be processed");
  }
  return data;
}

export const privilegedAccess = Object.freeze({
  findInvitationByTokenHash,
  findGuestInviteByTokenHash,
  findPassByReferenceHash,
  createGymTenant,
  processDueAnnouncements,
});

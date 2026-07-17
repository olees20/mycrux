import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getServerEnvironment } from "@/env/server";
import { normalizeDatabaseError } from "@/lib/server/errors";
import { logger } from "@/lib/server/logger";
import type { Database } from "./database.types";
import { gymBrandingSchema, gymDetailsSchema, type GymBranding, type GymDetails } from "@/features/gyms/validation";
import { acceptanceSchema } from "@/features/waivers/validation";

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

async function getGuestWaiverFlow(hash: string) {
  const client = createPrivilegedSupabaseClient();
  const invite = await findGuestInviteByTokenHash(hash);
  if (!invite || invite.expires_at <= new Date().toISOString() || !["pending", "registered"].includes(invite.status) || invite.archived_at) return null;
  const [{ data: gym, error: gymError }, { data: versions, error: versionError }, { data: acceptances, error: acceptanceError }] = await Promise.all([
    client.from("gyms").select("id,name,slug").eq("id", invite.gym_id).single(),
    client.from("waiver_versions").select("id,title,content,content_hash,requirements,published_at,waivers(name,description,is_required)").eq("gym_id", invite.gym_id).eq("status", "published").lte("effective_at", new Date().toISOString()),
    client.from("waiver_acceptances").select("id,waiver_version_id,accepted_name,accepted_at,signature_text,consent_snapshot,waiver_versions(title,content,content_hash,requirements,waivers(name))").eq("guest_invite_id", invite.id),
  ]);
  if (gymError || versionError || acceptanceError) throw normalizeDatabaseError(gymError ?? versionError ?? acceptanceError!, "The waiver flow could not be loaded");
  return { invite, gym, versions: versions ?? [], acceptances: acceptances ?? [] };
}

async function acceptGuestWaiver(hash: string, versionId: string, acceptance: unknown) {
  const client = createPrivilegedSupabaseClient();
  const { data, error } = await client.rpc("accept_guest_waiver", { invitation_token_hash: validateHash(hash), target_version_id: z.uuid().parse(versionId), acceptance: acceptanceSchema.parse(acceptance) });
  if (error) throw normalizeDatabaseError(error, "The guest waiver could not be accepted");
  return data;
}

export const privilegedAccess = Object.freeze({
  findInvitationByTokenHash,
  findGuestInviteByTokenHash,
  findPassByReferenceHash,
  createGymTenant,
  processDueAnnouncements,
  getGuestWaiverFlow,
  acceptGuestWaiver,
});

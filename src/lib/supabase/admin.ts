import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getServerEnvironment } from "@/env/server";
import { normalizeDatabaseError } from "@/lib/server/errors";
import { logger } from "@/lib/server/logger";
import type { Database, Json } from "./database.types";
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

async function getPublicDayPassGym(gymSlug: string) {
  const client=createPrivilegedSupabaseClient();const{data,error}=await client.from("gyms").select("id,slug,name,day_pass_information,day_pass_valid_hours").eq("slug",z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).parse(gymSlug)).eq("day_pass_registration_enabled",true).in("status",["trial","active"]).is("archived_at",null).maybeSingle();
  if(error)throw normalizeDatabaseError(error,"Day-pass registration could not be loaded");return data;
}

async function registerPublicDayPass(input:{gymSlug:string;guestName:string;guestEmail:string;paymentChoice:"pay_at_reception"|"integration_placeholder";invitationTokenHash:string;passReferenceHash:string}){
  const client=createPrivilegedSupabaseClient();const{data,error}=await client.rpc("register_public_day_pass",{target_gym_slug:input.gymSlug,guest_full_name:input.guestName,guest_email:input.guestEmail,invitation_token_hash:validateHash(input.invitationTokenHash),pass_reference_hash:validateHash(input.passReferenceHash),payment_choice:input.paymentChoice});if(error)throw normalizeDatabaseError(error,"Day-pass registration failed");if(!data||typeof data!=="object"||Array.isArray(data)||typeof data.valid_until!=="string")throw new Error("Registration response was invalid");return{validUntil:data.valid_until};
}

async function getIntegrationForWebhook(id:string,providerKey:string){const client=createPrivilegedSupabaseClient(),{data,error}=await client.from("integration_connections").select("id,gym_id,provider_key,status").eq("id",z.uuid().parse(id)).eq("provider_key",z.string().regex(/^[a-z][a-z0-9_.-]*$/).parse(providerKey)).maybeSingle();if(error)throw normalizeDatabaseError(error,"Integration lookup failed");return data;}
async function ingestIntegrationDelivery(integrationId:string,providerKey:string,eventKey:string,payload:Json){const client=createPrivilegedSupabaseClient(),{data,error}=await client.rpc("ingest_integration_delivery",{target_integration_id:z.uuid().parse(integrationId),target_provider_key:z.string().regex(/^[a-z][a-z0-9_.-]*$/).parse(providerKey),event_key:z.string().min(1).max(255).parse(eventKey),event_payload:payload});if(error)throw normalizeDatabaseError(error,"Integration delivery could not be accepted");return data;}
async function upsertStripeBillingCustomer(gymId:string,customerId:string,billingEmail:string){const client=createPrivilegedSupabaseClient(),{data,error}=await client.rpc("upsert_stripe_billing_customer",{target_gym_id:z.uuid().parse(gymId),customer_id:z.string().regex(/^cus_[A-Za-z0-9]+$/).parse(customerId),billing_address:z.union([z.email(),z.literal("")]).parse(billingEmail)});if(error)throw normalizeDatabaseError(error,"Billing customer could not be stored");return data;}
async function applyStripeSubscriptionEvent(input:{eventId:string;eventType:string;livemode:boolean;customerId:string;subscriptionId:string;priceId:string;status:string;periodStart:string|null;periodEnd:string|null;cancelAtPeriodEnd:boolean;cancelledAt:string|null;trialEnd:string|null;planKey:string}){const client=createPrivilegedSupabaseClient(),{data,error}=await client.rpc("apply_stripe_subscription_event",{event_id:input.eventId,event_type:input.eventType,event_livemode:input.livemode,customer_id:input.customerId,subscription_id:input.subscriptionId,price_id:input.priceId,subscription_status:input.status,period_start:input.periodStart??undefined,period_end:input.periodEnd??undefined,cancel_period_end:input.cancelAtPeriodEnd,cancelled_at:input.cancelledAt??undefined,trial_end:input.trialEnd??undefined,plan_name:input.planKey});if(error)throw normalizeDatabaseError(error,"Subscription event could not be applied");return data;}
async function listPlatformGyms(actorProfileId:string,searchTerm:string){const client=createPrivilegedSupabaseClient(),{data,error}=await client.rpc("platform_list_gyms",{actor_profile_id:z.uuid().parse(actorProfileId),search_term:z.string().trim().max(120).parse(searchTerm),result_limit:50});if(error)throw normalizeDatabaseError(error,"Platform gyms could not be loaded");return data;}
async function getPlatformGymSupportView(actorProfileId:string,gymId:string){const client=createPrivilegedSupabaseClient(),{data,error}=await client.rpc("platform_gym_support_view",{actor_profile_id:z.uuid().parse(actorProfileId),target_gym_id:z.uuid().parse(gymId)});if(error)throw normalizeDatabaseError(error,"Platform support view could not be loaded");return data;}
async function addPlatformSupportNote(actorProfileId:string,gymId:string,note:string){const client=createPrivilegedSupabaseClient(),{data,error}=await client.rpc("add_platform_support_note",{actor_profile_id:z.uuid().parse(actorProfileId),target_gym_id:z.uuid().parse(gymId),note_body:z.string().trim().min(3).max(2000).parse(note)});if(error)throw normalizeDatabaseError(error,"Support note could not be added");return data;}
async function suspendPlatformGym(actorProfileId:string,gymId:string,reason:string){const client=createPrivilegedSupabaseClient(),{error}=await client.rpc("suspend_platform_gym",{actor_profile_id:z.uuid().parse(actorProfileId),target_gym_id:z.uuid().parse(gymId),reason:z.string().trim().min(3).max(500).parse(reason)});if(error)throw normalizeDatabaseError(error,"Gym could not be suspended");}
async function restorePlatformGym(actorProfileId:string,gymId:string,reason:string){const client=createPrivilegedSupabaseClient(),{error}=await client.rpc("restore_platform_gym",{actor_profile_id:z.uuid().parse(actorProfileId),target_gym_id:z.uuid().parse(gymId),reason:z.string().trim().min(3).max(500).parse(reason)});if(error)throw normalizeDatabaseError(error,"Gym could not be restored");}
async function checkDatabaseHealth(){const client=createPrivilegedSupabaseClient(),{error}=await client.from("gyms").select("id",{head:true}).limit(1);if(error)throw normalizeDatabaseError(error,"Database health check failed");}
async function getIntegrationDeliveryHealth(){
  const client=createPrivilegedSupabaseClient();
  const [pending,retry,deadLetter,oldest]=await Promise.all([
    client.from("integration_deliveries").select("id",{head:true,count:"exact"}).eq("status","pending"),
    client.from("integration_deliveries").select("id",{head:true,count:"exact"}).eq("status","retry"),
    client.from("integration_deliveries").select("id",{head:true,count:"exact"}).eq("status","dead_letter"),
    client.from("integration_deliveries").select("created_at").in("status",["pending","retry"]).order("created_at",{ascending:true}).limit(1).maybeSingle(),
  ]);
  const error=pending.error??retry.error??deadLetter.error??oldest.error;
  if(error)throw normalizeDatabaseError(error,"Integration delivery health could not be loaded");
  return{pending:pending.count??0,retry:retry.count??0,deadLetter:deadLetter.count??0,oldestQueuedAt:oldest.data?.created_at??null};
}

export const privilegedAccess = Object.freeze({
  findInvitationByTokenHash,
  findGuestInviteByTokenHash,
  findPassByReferenceHash,
  createGymTenant,
  processDueAnnouncements,
  getGuestWaiverFlow,
  acceptGuestWaiver,
  getPublicDayPassGym,
  registerPublicDayPass,
  getIntegrationForWebhook,
  ingestIntegrationDelivery,
  upsertStripeBillingCustomer,
  applyStripeSubscriptionEvent,
  listPlatformGyms,
  getPlatformGymSupportView,
  addPlatformSupportNote,
  suspendPlatformGym,
  restorePlatformGym,
  checkDatabaseHealth,
  getIntegrationDeliveryHealth,
});

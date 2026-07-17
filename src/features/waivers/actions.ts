"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { privilegedAccess } from "@/lib/supabase/admin";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import type { WaiverActionState } from "./state";
import { acceptanceSchema, requirementsSchema } from "./validation";

const gymSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/); const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,256}$/);
function tokenHash(token: string) { return createHash("sha256").update(tokenSchema.parse(token)).digest("hex"); }
async function acceptance(formData: FormData) { const requestHeaders = await headers(); return acceptanceSchema.safeParse({ accepted_name: formData.get("acceptedName"), signature_text: formData.get("signatureText"), date_of_birth: formData.get("dateOfBirth") ?? "", age_confirmed: formData.get("ageConfirmed") === "on", emergency_contact_name: formData.get("emergencyContactName") ?? "", emergency_contact_phone: formData.get("emergencyContactPhone") ?? "", consents: formData.getAll("consents"), user_agent: requestHeaders.get("user-agent")?.slice(0,1000) ?? "" }); }

export async function saveWaiverDraftAction(_state: WaiverActionState, formData: FormData): Promise<WaiverActionState> {
  const parsed = z.object({ gymSlug, waiverId: z.union([z.uuid(),z.literal("")]), name: z.string().trim().min(1).max(160), description: z.string().trim().max(1000), title: z.string().trim().min(1).max(200), content: z.string().trim().min(1).max(100000), minimumAge: z.coerce.number().int().min(1).max(120), consentItems: z.string().max(10000) }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status:"error", message:parsed.error.issues[0]?.message ?? "Check the waiver" };
  const requirements = requirementsSchema.safeParse({ collect_date_of_birth:formData.get("collectDateOfBirth")==="on", require_age_confirmation:formData.get("requireAgeConfirmation")==="on", minimum_age:parsed.data.minimumAge, collect_emergency_contact:formData.get("collectEmergencyContact")==="on", consent_items:parsed.data.consentItems.split("\n").map((item)=>item.trim()).filter(Boolean) });
  if (!requirements.success) return { status:"error", message:requirements.error.issues[0]?.message ?? "Add at least one consent item" };
  const { gym } = await requireActiveGymContext({ gymSlug:parsed.data.gymSlug, allowedRoles:["owner","staff"] }); const supabase=await createServerComponentSupabaseClient();
  const { error }=await supabase.rpc("save_waiver_draft",{ target_gym_id:gym.id,target_waiver_id:parsed.data.waiverId||null,template_name:parsed.data.name,template_description:parsed.data.description,required_for_entry:formData.get("requiredForEntry")==="on",version_title:parsed.data.title,version_content:parsed.data.content,version_requirements:requirements.data });
  if(error) return {status:"error",message:"The waiver draft could not be saved."}; revalidatePath(`/g/${gym.slug}/staff/waivers`); return {status:"success",message:"Waiver draft saved."};
}
export async function publishWaiverAction(formData:FormData){const parsed=z.object({gymSlug,versionId:z.uuid()}).parse(Object.fromEntries(formData.entries()));const {gym}=await requireActiveGymContext({gymSlug:parsed.gymSlug,allowedRoles:["owner","staff"]});const supabase=await createServerComponentSupabaseClient();await supabase.rpc("publish_waiver_version",{target_gym_id:gym.id,target_version_id:parsed.versionId});revalidatePath(`/g/${gym.slug}/staff/waivers`);revalidatePath(`/g/${gym.slug}/app/waivers`);}

export async function acceptMemberWaiverAction(_state:WaiverActionState,formData:FormData):Promise<WaiverActionState>{const fields=z.object({gymSlug,versionId:z.uuid()}).safeParse(Object.fromEntries(formData.entries()));const signed=await acceptance(formData);if(!fields.success||!signed.success)return{status:"error",message:signed.error?.issues[0]?.message??"Complete every required field"};const {gym}=await requireActiveGymContext({gymSlug:fields.data.gymSlug});const supabase=await createServerComponentSupabaseClient();const {error}=await supabase.rpc("accept_member_waiver",{target_gym_id:gym.id,target_version_id:fields.data.versionId,acceptance:signed.data as Json});if(error)return{status:"error",message:error.code==="23505"?"You already accepted this version.":"The waiver could not be accepted. Check every required field."};revalidatePath(`/g/${gym.slug}/app/waivers`);return{status:"success",message:"Waiver accepted. Your exact signed version is now available below."};}

export async function acceptGuestWaiverAction(_state:WaiverActionState,formData:FormData):Promise<WaiverActionState>{const fields=z.object({token:tokenSchema,versionId:z.uuid()}).safeParse(Object.fromEntries(formData.entries()));const signed=await acceptance(formData);if(!fields.success||!signed.success)return{status:"error",message:signed.error?.issues[0]?.message??"Complete every required field"};try{await privilegedAccess.acceptGuestWaiver(tokenHash(fields.data.token),fields.data.versionId,signed.data);revalidatePath(`/waiver/${fields.data.token}`);return{status:"success",message:"Waiver accepted. This page now shows the exact version you signed."};}catch{return{status:"error",message:"The waiver link is invalid, expired, already used for this version, or the form is incomplete."};}}

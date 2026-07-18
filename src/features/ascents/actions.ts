"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { discardMedia, uploadMedia } from "@/lib/server/media";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import type { AscentActionState } from "./state";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const schema = z.object({
  gymSlug: slug, routeId: z.uuid(), ascentId: z.union([z.uuid(), z.literal("")]), sessionId: z.union([z.uuid(), z.literal("")]),
  sessionDate: z.iso.date(), outcome: z.enum(["flash", "onsight", "redpoint", "repeat", "attempted", "project"]),
  attempts: z.coerce.number().int().min(1).max(999), notes: z.string().trim().max(2000), visibility: z.enum(["private", "gym", "public"]),
});

function refresh(gymSlug: string, routeId: string) { revalidatePath(`/g/${gymSlug}/app/logbook`); revalidatePath(`/g/${gymSlug}/app/routes/${routeId}`); }
export async function saveAscentAction(_state: AscentActionState, formData: FormData): Promise<AscentActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the ascent" };
  if (parsed.data.sessionDate > new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)) return { status: "error", message: "Session date cannot be in the future." };
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.data.gymSlug });
  const supabase = await createServerComponentSupabaseClient();
  const { data: ascentId, error } = await supabase.rpc("save_ascent", {
    target_gym_id: gym.id, target_route_id: parsed.data.routeId, target_ascent_id: parsed.data.ascentId || null,
    target_session_id: parsed.data.sessionId || null, target_session_date: parsed.data.sessionDate, target_outcome: parsed.data.outcome,
    target_attempts: parsed.data.attempts, target_notes: parsed.data.notes, target_visibility: parsed.data.visibility,
  });
  if (error || !ascentId) return { status: "error", message: error?.message ?? "The ascent could not be saved." };
  const media = formData.get("media");
  if (media instanceof File && media.size) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { status: "error", message: "Sign in again before uploading media." };
    let uploaded;try{uploaded=await uploadMedia({client:supabase,file:media,purpose:"ascent",gymId:gym.id,ownerProfileId:user.id,targetId:ascentId});}catch(error){return{status:"error",message:`Ascent saved, but ${error instanceof Error?error.message:"media upload failed."}`};}
    const attached = await supabase.rpc("attach_ascent_media", { target_gym_id: gym.id, target_ascent_id: ascentId, object_path:uploaded.storagePath, object_media_type:uploaded.mimeType==="video/mp4"?"video":"image" });
    if (attached.error) {await discardMedia(supabase,uploaded);return { status: "error", message: "Ascent saved, but media could not be attached." }; }
  }
  await supabase.rpc("process_my_achievements", { target_gym_id: gym.id });
  refresh(gym.slug, parsed.data.routeId);
  return { status: "success", message: parsed.data.ascentId ? "Ascent updated." : "Ascent logged." };
}

export async function deleteAscentAction(formData: FormData) {
  const parsed = z.object({ gymSlug: slug, routeId: z.uuid(), ascentId: z.uuid() }).parse(Object.fromEntries(formData.entries()));
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.gymSlug });
  const supabase = await createServerComponentSupabaseClient();
  await supabase.rpc("delete_ascent", { target_gym_id: gym.id, target_ascent_id: parsed.ascentId });
  refresh(gym.slug, parsed.routeId);
}

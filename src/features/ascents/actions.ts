"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import type { AscentActionState } from "./state";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const schema = z.object({
  gymSlug: slug, routeId: z.uuid(), ascentId: z.union([z.uuid(), z.literal("")]), sessionId: z.union([z.uuid(), z.literal("")]),
  sessionDate: z.iso.date(), outcome: z.enum(["flash", "onsight", "redpoint", "repeat", "attempted", "project"]),
  attempts: z.coerce.number().int().min(1).max(999), notes: z.string().trim().max(2000), visibility: z.enum(["private", "gym", "public"]),
});

function refresh(gymSlug: string, routeId: string) { revalidatePath(`/g/${gymSlug}/app/logbook`); revalidatePath(`/g/${gymSlug}/app/routes/${routeId}`); }
async function validMedia(file: File) {
  if (file.size > 20 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp", "video/mp4"].includes(file.type)) return false;
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/png") return bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  if (file.type === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (file.type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
}

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
    if (!(await validMedia(media))) return { status: "error", message: "Ascent saved, but media must be a valid PNG, JPEG, WebP or MP4 up to 20 MB." };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { status: "error", message: "Sign in again before uploading media." };
    const extension = media.type === "image/png" ? "png" : media.type === "image/webp" ? "webp" : media.type === "video/mp4" ? "mp4" : "jpg";
    const path = `${gym.id}/${user.id}/${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage.from("ascent-media").upload(path, media, { contentType: media.type });
    if (upload.error) return { status: "error", message: "Ascent saved, but media upload failed." };
    const attached = await supabase.rpc("attach_ascent_media", { target_gym_id: gym.id, target_ascent_id: ascentId, object_path: path, object_media_type: media.type === "video/mp4" ? "video" : "image" });
    if (attached.error) { await supabase.storage.from("ascent-media").remove([path]); return { status: "error", message: "Ascent saved, but media could not be attached." }; }
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

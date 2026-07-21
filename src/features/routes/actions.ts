"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { discardMedia, uploadMedia } from "@/lib/server/media";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import type { RouteActionState } from "./state";
import { parseOverlay } from "./validation";

const gymSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const optionalDate = z.union([z.iso.date(), z.literal("")]);
const wallSchema = z.object({ gymSlug, wallId: z.union([z.uuid(), z.literal("")]).optional(), name: z.string().trim().min(1).max(100), description: z.string().trim().max(1_000), sortOrder: z.coerce.number().int().min(0).max(10_000) });
const routeSchema = z.object({
  gymSlug, routeId: z.union([z.uuid(), z.literal("")]).optional(), wallId: z.uuid(), wallImageId: z.union([z.uuid(), z.literal("")]),
  name: z.string().trim().max(120), colour: z.string().trim().min(1).max(40), gradeSystem: z.string().trim().min(1).max(30), grade: z.string().trim().min(1).max(20),
  discipline: z.enum(["boulder", "sport", "top_rope", "trad", "training"]), setterId: z.union([z.uuid(), z.literal("")]), setOn: optionalDate, retireOn: optionalDate,
  status: z.enum(["draft", "published", "retired", "archived"]), tags: z.string().max(500), description: z.string().trim().max(2_000), overlay: z.string().max(20_000),
}).superRefine((value, context) => { if (value.setOn && value.retireOn && value.retireOn < value.setOn) context.addIssue({ code: "custom", path: ["retireOn"], message: "Removal date must be after the set date" }); });

function message(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback; }
async function context(slug: string) { return requireActiveGymContext({ gymSlug: slug, allowedRoles: ["owner", "staff", "route_setter"] }); }
function refresh(slug: string) { revalidatePath(`/g/${slug}/staff/routes`); revalidatePath(`/g/${slug}/app/routes`); }

export async function saveWallAction(_state: RouteActionState, formData: FormData): Promise<RouteActionState> {
  const parsed = wallSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the wall" };
  const { gym } = await context(parsed.data.gymSlug); const supabase = await createServerComponentSupabaseClient();
  const values = { name: parsed.data.name, description: parsed.data.description || null, sort_order: parsed.data.sortOrder };
  const result = parsed.data.wallId
    ? await supabase.from("walls").update(values).eq("id", parsed.data.wallId).eq("gym_id", gym.id).select("id").single()
    : await supabase.from("walls").insert({ ...values, gym_id: gym.id }).select("id").single();
  if (result.error) return { status: "error", message: "The wall could not be saved. Check your route-management permission." };
  refresh(gym.slug); return { status: "success", message: parsed.data.wallId ? "Wall updated." : "Wall created." };
}

export async function archiveWallAction(formData: FormData) {
  const parsed = z.object({ gymSlug, wallId: z.uuid() }).parse(Object.fromEntries(formData.entries()));
  const { gym } = await context(parsed.gymSlug); const supabase = await createServerComponentSupabaseClient();
  await supabase.from("walls").update({ is_active: false, archived_at: new Date().toISOString() }).eq("id", parsed.wallId).eq("gym_id", gym.id);
  refresh(gym.slug);
}

export async function uploadWallImageAction(_state: RouteActionState, formData: FormData): Promise<RouteActionState> {
  const fields = z.object({ gymSlug, wallId: z.uuid(), altText: z.string().trim().min(1).max(500), capturedAt: z.string() }).safeParse(Object.fromEntries(formData.entries()));
  const file=formData.get("image");if(!fields.success||!(file instanceof File))return{status:"error",message:fields.error?.issues[0]?.message??"Choose an image."};
  const { gym } = await context(fields.data.gymSlug); const supabase = await createServerComponentSupabaseClient();
  const{data:{user}}=await supabase.auth.getUser();if(!user)return{status:"error",message:"Sign in again before uploading."};let media;try{media=await uploadMedia({client:supabase,file,purpose:"wall",gymId:gym.id,ownerProfileId:user.id,targetId:fields.data.wallId});}catch(error){return{status:"error",message:message(error,"The wall image could not be uploaded.")};}
  const attached = await supabase.rpc("attach_wall_image", { target_gym_id: gym.id, target_wall_id: fields.data.wallId, object_path:media.storagePath, image_alt_text: fields.data.altText, image_width:media.width??1, image_height:media.height??1, image_captured_at: fields.data.capturedAt ? new Date(`${fields.data.capturedAt}T12:00:00Z`).toISOString() : null });
  if (attached.error) {await discardMedia(supabase,media);return { status: "error", message: "The image could not be attached to this wall." }; }
  refresh(gym.slug); return { status: "success", message: "Current wall image updated; the previous image remains archived." };
}

export async function saveRouteAction(_state: RouteActionState, formData: FormData): Promise<RouteActionState> {
  const parsed = routeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the route" };
  let overlay: Json | null;
  try { overlay = parseOverlay(parsed.data.overlay) as Json | null; } catch (error) { return { status: "error", message: message(error, "The overlay is invalid") }; }
  const { gym } = await context(parsed.data.gymSlug); const supabase = await createServerComponentSupabaseClient();
  const now = new Date().toISOString();
  const values = {
    wall_id: parsed.data.wallId, wall_image_id: parsed.data.wallImageId || null, name: parsed.data.name || null, colour: parsed.data.colour,
    grade_system: parsed.data.gradeSystem, grade: parsed.data.grade, route_type: parsed.data.discipline, setter_id: parsed.data.setterId || null,
    set_on: parsed.data.setOn || null, retire_on: parsed.data.retireOn || null, description: parsed.data.description || null, overlay,
    status: parsed.data.status, published_at: parsed.data.status === "published" ? now : null,
    retired_at: parsed.data.status === "retired" || parsed.data.status === "archived" ? now : null, archived_at: parsed.data.status === "archived" ? now : null,
  };
  const result = parsed.data.routeId
    ? await supabase.from("routes").update(values).eq("id", parsed.data.routeId).eq("gym_id", gym.id).select("id").single()
    : await supabase.from("routes").insert({ ...values, gym_id: gym.id }).select("id").single();
  if (result.error) return { status: "error", message: "The route could not be saved. Check the selected wall, image, and permissions." };
  const tags = [...new Set(parsed.data.tags.split(",").map((tag) => tag.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean))].filter((tag) => tag.length <= 40);
  await supabase.from("route_tags").delete().eq("route_id", result.data.id).eq("gym_id", gym.id);
  if (tags.length) await supabase.from("route_tags").insert(tags.map((tag) => ({ gym_id: gym.id, route_id: result.data.id, tag })));
  refresh(gym.slug); return { status: "success", message: parsed.data.routeId ? "Route updated." : "Route created." };
}

export async function uploadRouteMediaAction(_state: RouteActionState, formData: FormData): Promise<RouteActionState> {
  const fields = z.object({ gymSlug, routeId: z.uuid(), altText: z.string().trim().max(500) }).safeParse(Object.fromEntries(formData.entries()));
  const file=formData.get("image");if(!fields.success||!(file instanceof File))return{status:"error",message:fields.error?.issues[0]?.message??"Choose an image."};
  const { gym } = await context(fields.data.gymSlug); const supabase = await createServerComponentSupabaseClient();
  const{data:{user}}=await supabase.auth.getUser();if(!user)return{status:"error",message:"Sign in again before uploading."};let media;try{media=await uploadMedia({client:supabase,file,purpose:"route",gymId:gym.id,ownerProfileId:user.id,targetId:fields.data.routeId});}catch(error){return{status:"error",message:message(error,"The media could not be uploaded.")};}
  const attached = await supabase.rpc("attach_route_media", { target_gym_id: gym.id, target_route_id: fields.data.routeId, object_path:media.storagePath, object_media_type: "image", object_alt_text: fields.data.altText || null });
  if (attached.error) {await discardMedia(supabase,media);return { status: "error", message: "The media could not be attached to this route." }; }
  refresh(gym.slug); return { status: "success", message: "Route media uploaded." };
}

export async function bulkRouteAction(formData: FormData) {
  const parsed = z.object({ gymSlug, operation: z.enum(["publish", "retire"]), routeIds: z.array(z.uuid()).min(1) }).parse({ gymSlug: formData.get("gymSlug"), operation: formData.get("operation"), routeIds: formData.getAll("routeIds") });
  const { gym } = await context(parsed.gymSlug); const supabase = await createServerComponentSupabaseClient();
  await (parsed.operation === "publish" ? supabase.rpc("publish_routes", { target_gym_id: gym.id, target_route_ids: parsed.routeIds }) : supabase.rpc("retire_routes", { target_gym_id: gym.id, target_route_ids: parsed.routeIds }));
  refresh(gym.slug);
}

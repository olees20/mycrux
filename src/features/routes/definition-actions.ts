"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const optionalDate = z.union([z.iso.date(), z.literal("")]);
const definition = z.object({
  gymSlug: slug,
  faceId: z.uuid(),
  routeId: z.uuid().nullable(),
  expectedRevision: z.number().int().nonnegative(),
  name: z.string().trim().min(1, "Enter a route name.").max(120),
  colour: z.string().trim().min(1).max(40),
  gradeSystem: z.string().trim().min(1).max(30),
  grade: z.string().trim().min(1).max(20),
  routeType: z.enum(["boulder", "sport", "top_rope", "trad", "training"]),
  status: z.enum(["draft", "published", "retired"]),
  setterId: z.union([z.uuid(), z.literal("")]),
  setOn: optionalDate,
  retireOn: optionalDate,
  description: z.string().trim().max(2000),
  tags: z.array(z.string().trim().min(1).max(40)).max(30),
  holdIds: z.array(z.uuid()).min(1, "Select at least one hold on the wall.").max(10000),
}).superRefine((value, issue) => {
  if (new Set(value.holdIds).size !== value.holdIds.length) issue.addIssue({ code: "custom", path: ["holdIds"], message: "A hold can only appear once in a route." });
  if (value.setOn && value.retireOn && value.retireOn < value.setOn) issue.addIssue({ code: "custom", path: ["retireOn"], message: "Removal date must follow the set date." });
});

export type RouteDefinitionResult = { status: "success"; message: string; routeId: string; revision: number } | { status: "error"; message: string; conflict?: boolean };

async function routeContext(gymSlug: string) {
  return requireActiveGymContext({ gymSlug, allowedRoles: ["owner", "staff", "route_setter"] });
}

function refresh(gymSlug: string, faceId: string) {
  revalidatePath(`/g/${gymSlug}/staff/floorplan/faces/${faceId}`);
  revalidatePath(`/g/${gymSlug}/staff/routes`);
  revalidatePath(`/g/${gymSlug}/app/routes`);
}

export async function saveRouteDefinitionAction(input: z.input<typeof definition>): Promise<RouteDefinitionResult> {
  const parsed = definition.safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the route definition." };
  const { gym } = await routeContext(parsed.data.gymSlug);
  const supabase = await createServerComponentSupabaseClient();
  const { data, error } = await supabase.rpc("save_hold_based_route", {
    target_gym_id: gym.id,
    target_route_id: parsed.data.routeId,
    expected_revision: parsed.data.expectedRevision,
    target_wall_id: parsed.data.faceId,
    definition: { name: parsed.data.name, colour: parsed.data.colour, gradeSystem: parsed.data.gradeSystem, grade: parsed.data.grade, routeType: parsed.data.routeType, status: parsed.data.status, setterId: parsed.data.setterId, setOn: parsed.data.setOn, retireOn: parsed.data.retireOn, description: parsed.data.description, tags: [...new Set(parsed.data.tags.map((tag) => tag.toLowerCase()))] },
    selected_hold_ids: parsed.data.holdIds,
  });
  if (error) {
    const conflict = error.code === "40001" || error.message.includes("another session");
    return { status: "error", conflict, message: conflict ? "This route changed in another session. Reload before saving." : "The route could not be saved. Check the face, holds, setter, and permissions." };
  }
  const result = data as { route_id: string; revision: number };
  refresh(gym.slug, parsed.data.faceId);
  return { status: "success", message: parsed.data.routeId ? "Route updated with a new history revision." : "Route created from the selected holds.", routeId: result.route_id, revision: Number(result.revision) };
}

const routeOperation = z.object({ gymSlug: slug, faceId: z.uuid(), routeId: z.uuid(), expectedRevision: z.number().int().positive() });

export async function archiveRouteDefinitionAction(input: z.input<typeof routeOperation>): Promise<RouteDefinitionResult> {
  const parsed = routeOperation.safeParse(input);
  if (!parsed.success) return { status: "error", message: "The route could not be archived." };
  const { gym } = await routeContext(parsed.data.gymSlug);
  const supabase = await createServerComponentSupabaseClient();
  const { data, error } = await supabase.rpc("archive_hold_based_route", { target_gym_id: gym.id, target_route_id: parsed.data.routeId, expected_revision: parsed.data.expectedRevision });
  if (error) return { status: "error", conflict: error.code === "40001", message: error.code === "40001" ? "This route changed in another session. Reload first." : "The route could not be archived." };
  const result = data as { route_id: string; revision: number };
  refresh(gym.slug, parsed.data.faceId);
  return { status: "success", message: "Route archived. Its complete history remains available.", routeId: result.route_id, revision: Number(result.revision) };
}

export async function duplicateRouteDefinitionAction(input: z.input<typeof routeOperation>): Promise<RouteDefinitionResult> {
  const parsed = routeOperation.safeParse(input);
  if (!parsed.success) return { status: "error", message: "The route could not be duplicated." };
  const { gym } = await routeContext(parsed.data.gymSlug);
  const supabase = await createServerComponentSupabaseClient();
  const { data, error } = await supabase.rpc("duplicate_hold_based_route", { target_gym_id: gym.id, source_route_id: parsed.data.routeId, expected_revision: parsed.data.expectedRevision });
  if (error) return { status: "error", conflict: error.code === "40001", message: error.code === "40001" ? "This route changed in another session. Reload first." : "The route could not be duplicated." };
  const result = data as { route_id: string; revision: number };
  refresh(gym.slug, parsed.data.faceId);
  return { status: "success", message: "Route duplicated as a new draft with the same holds.", routeId: result.route_id, revision: Number(result.revision) };
}

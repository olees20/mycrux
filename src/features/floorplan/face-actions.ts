"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

const faceSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(100),
  widthMetres: z.number().min(0.1).max(200),
  heightMetres: z.number().min(0.1).max(100),
  climbingAngleDegrees: z.number().min(-90).max(180),
  notes: z.string().trim().max(1000),
  sortOrder: z.number().int().min(0).max(99),
});

const inputSchema = z.object({
  gymSlug: z.string().trim().min(1).max(80),
  structureId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
  faces: z.array(faceSchema).max(100),
}).superRefine((value, context) => {
  const names = new Set<string>();
  value.faces.forEach((face, index) => {
    const name = face.name.toLocaleLowerCase("en-GB");
    if (names.has(name)) context.addIssue({ code: "custom", path: ["faces", index, "name"], message: "Face names must be unique within this wall structure." });
    names.add(name);
  });
});

export type SaveFacesInput = z.input<typeof inputSchema>;
export type SaveFacesResult = { status: "success"; revision: number; message: string } | { status: "error"; message: string; conflict?: boolean };

export async function saveWallFacesAction(input: SaveFacesInput): Promise<SaveFacesResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the climbing face values." };
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.data.gymSlug, allowedRoles: ["owner"] });
  const supabase = await createServerComponentSupabaseClient();
  const { data, error } = await supabase.rpc("save_wall_structure_faces", {
    target_gym_id: gym.id,
    target_structure_id: parsed.data.structureId,
    expected_revision: parsed.data.expectedRevision,
    face_payload: parsed.data.faces,
  });
  if (error) {
    const conflict = error.code === "40001" || error.message.includes("another session");
    const routeHistory = error.code === "23503" || error.message.includes("route history");
    const duplicate = error.code === "23505" || error.message.includes("unique");
    const hasHolds = error.message.includes("holds first");
    return { status: "error", conflict, message: conflict ? "These faces changed in another session. Reload before saving again." : routeHistory ? "A deleted face still has route history. Move or archive its routes before removing the face." : hasHolds ? "Remove or reposition the face’s holds before shrinking or deleting it." : duplicate ? "Each face on this wall structure needs a unique name." : "The climbing faces could not be saved. Check their measurements and try again." };
  }
  const result = data as { revision?: number } | null;
  revalidatePath(`/g/${gym.slug}/staff/floorplan`); revalidatePath(`/g/${gym.slug}/staff/routes`); revalidatePath(`/g/${gym.slug}/app/routes`);
  return { status: "success", revision: result?.revision ?? parsed.data.expectedRevision + 1, message: "Climbing faces saved." };
}

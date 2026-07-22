"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import { validateSurfacePolygon } from "@/features/digital-twin/geometry";

const vertexSchema = z.object({ u: z.number().min(-200).max(200), v: z.number().min(-100).max(100), depth: z.number().min(-100).max(100), order: z.number().int().min(0).max(31), connectionKey: z.uuid().nullable() });

const faceSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(100),
  widthMetres: z.number().min(0.1).max(200),
  heightMetres: z.number().min(0.1).max(100),
  climbingAngleDegrees: z.number().min(-90).max(180),
  notes: z.string().trim().max(1000),
  sortOrder: z.number().int().min(0).max(99),
  surfaceKind: z.enum(["rectangle", "triangle_left", "triangle_right", "quadrilateral", "custom"]),
  profile: z.enum(["vertical", "slab", "overhang", "steep", "roof", "left_facet", "right_facet", "custom"]),
  facingDirection: z.union([z.literal(-1), z.literal(1)]),
  localOffsetU: z.number().min(-200).max(200),
  localOffsetV: z.number().min(-100).max(100),
  localOffsetDepth: z.number().min(-100).max(100),
  materialColour: z.string().regex(/^#[0-9a-f]{6}$/i),
  vertices: z.array(vertexSchema).max(32),
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
    if (face.surfaceKind === "custom") {
      const validation = validateSurfacePolygon(face.vertices);
      if (!validation.valid) context.addIssue({ code: "custom", path: ["faces", index, "vertices"], message: validation.reason });
    }
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
    const excludesHolds=error.message.includes("exclude installed holds");
    return { status: "error", conflict, message: conflict ? "These faces changed in another session. Reload before saving again." : routeHistory ? "A deleted face still has route history. Move or archive its routes before removing the face." : hasHolds||excludesHolds ? "Reposition the face’s installed holds before shrinking or reshaping its surface." : duplicate ? "Each face on this wall structure needs a unique name." : "The climbing faces could not be saved. Check their measurements and try again." };
  }
  const result = data as { revision?: number } | null;
  revalidatePath(`/g/${gym.slug}/staff/floorplan`); revalidatePath(`/g/${gym.slug}/staff/routes`); revalidatePath(`/g/${gym.slug}/app/routes`);
  return { status: "success", revision: result?.revision ?? parsed.data.expectedRevision + 1, message: "Climbing faces saved." };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

const configurationSchema = z.object({
  widthMetres: z.number().min(5).max(1000),
  heightMetres: z.number().min(5).max(1000),
  gridSizeMetres: z.number().min(0.1).max(10),
  showGrid: z.boolean(),
  snapToGrid: z.boolean(),
});

const wallSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(100),
  startXMetres: z.number().min(0).max(1000),
  startYMetres: z.number().min(0).max(1000),
  endXMetres: z.number().min(0).max(1000),
  endYMetres: z.number().min(0).max(1000),
  thicknessMetres: z.number().min(0.05).max(2),
  createdAt: z.iso.datetime(),
}).refine((value) => Math.hypot(value.endXMetres - value.startXMetres, value.endYMetres - value.startYMetres) >= 0.05, "Walls must be at least 5 cm long.");

const inputSchema = z.object({
  gymSlug: z.string().trim().min(1).max(80),
  floorplanId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
  configuration: configurationSchema,
  walls: z.array(wallSchema).max(5000),
}).superRefine((value, context) => {
  value.walls.forEach((wall, index) => {
    if (wall.startXMetres > value.configuration.widthMetres || wall.endXMetres > value.configuration.widthMetres || wall.startYMetres > value.configuration.heightMetres || wall.endYMetres > value.configuration.heightMetres) {
      context.addIssue({ code: "custom", path: ["walls", index], message: `${wall.name} lies outside the floorplan.` });
    }
  });
});

export type SaveFloorplanInput = z.input<typeof inputSchema>;
export type SaveFloorplanResult = { status: "success"; revision: number; message: string } | { status: "error"; message: string; conflict?: boolean };

export async function saveFloorplanAction(input: SaveFloorplanInput): Promise<SaveFloorplanResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the floorplan values." };

  const { gym } = await requireActiveGymContext({ gymSlug: parsed.data.gymSlug, allowedRoles: ["owner"] });
  const supabase = await createServerComponentSupabaseClient();
  const { data, error } = await supabase.rpc("save_gym_floorplan", {
    target_gym_id: gym.id,
    target_floorplan_id: parsed.data.floorplanId,
    expected_revision: parsed.data.expectedRevision,
    floorplan_configuration: parsed.data.configuration,
    wall_payload: parsed.data.walls,
  });

  if (error) {
    const conflict = error.code === "40001" || error.message.includes("another session");
    const hasFaces = error.message.includes("climbing faces first");
    return {
      status: "error",
      conflict,
      message: conflict ? "This floorplan changed in another session. Reload before saving again." : hasFaces ? "Remove a wall structure’s climbing faces before deleting that structure." : "The floorplan could not be saved. Check every wall is inside the canvas and try again.",
    };
  }

  const result = data as { revision?: number } | null;
  revalidatePath(`/g/${gym.slug}/staff/floorplan`);
  return { status: "success", revision: result?.revision ?? parsed.data.expectedRevision + 1, message: "Floorplan saved." };
}

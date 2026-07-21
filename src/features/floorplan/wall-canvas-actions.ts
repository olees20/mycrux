"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

const schema = z.object({ gymSlug: z.string().trim().min(1).max(80), faceId: z.uuid(), expectedRevision: z.number().int().nonnegative(), gridSizeMetres: z.number().min(0.05).max(5), showGrid: z.boolean(), snapToGrid: z.boolean() });
export type SaveWallCanvasInput = z.input<typeof schema>;
export type SaveWallCanvasResult = { status: "success"; revision: number; message: string } | { status: "error"; message: string; conflict?: boolean };

export async function saveWallCanvasAction(input: SaveWallCanvasInput): Promise<SaveWallCanvasResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the canvas settings." };
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.data.gymSlug, allowedRoles: ["owner"] });
  const supabase = await createServerComponentSupabaseClient();
  const { data, error } = await supabase.rpc("save_wall_canvas_settings", {
    target_gym_id: gym.id,
    target_face_id: parsed.data.faceId,
    expected_revision: parsed.data.expectedRevision,
    grid_size_metres: parsed.data.gridSizeMetres,
    show_grid: parsed.data.showGrid,
    snap_to_grid: parsed.data.snapToGrid,
  });
  if (error) {
    const conflict = error.code === "40001" || error.message.includes("another session");
    return { status: "error", conflict, message: conflict ? "This wall canvas changed in another session. Reload before saving again." : "The canvas settings could not be saved. Check the grid size and try again." };
  }
  const result = data as { revision?: number } | null;
  revalidatePath(`/g/${gym.slug}/staff/floorplan/faces/${parsed.data.faceId}`);
  return { status: "success", revision: result?.revision ?? parsed.data.expectedRevision + 1, message: "Canvas settings saved." };
}

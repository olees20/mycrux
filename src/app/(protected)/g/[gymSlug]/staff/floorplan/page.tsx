import { FloorplanEditor } from "@/components/floorplan-editor";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export default async function FloorplanPage({ params }: { params: Promise<{ gymSlug: string }> }) {
  const { gymSlug } = await params;
  const { gym } = await requireActiveGymContext({ gymSlug, allowedRoles: ["owner"] });
  const supabase = await createServerComponentSupabaseClient();
  const { data: floorplanId, error: ensureError } = await supabase.rpc("ensure_gym_floorplan", { target_gym_id: gym.id });
  if (ensureError || !floorplanId) throw new Error("Floorplan unavailable");

  const [{ data: floorplan, error: floorplanError }, { data: walls, error: wallsError }, { data: faces, error: facesError }] = await Promise.all([
    supabase.from("gym_floorplans").select("id,width_metres,height_metres,grid_size_metres,show_grid,snap_to_grid,revision").eq("id", floorplanId).eq("gym_id", gym.id).single(),
    supabase.from("wall_structures").select("id,name,start_x_metres,start_y_metres,end_x_metres,end_y_metres,thickness_metres,length_metres,faces_revision,created_at").eq("floorplan_id", floorplanId).eq("gym_id", gym.id).is("archived_at", null).order("created_at"),
    supabase.from("walls").select("id,wall_structure_id,name,description,sort_order,width_metres,height_metres,climbing_angle_degrees,created_at,routes(id)").eq("gym_id", gym.id).not("wall_structure_id", "is", null).eq("is_active", true).is("archived_at", null).order("sort_order"),
  ]);
  if (floorplanError || wallsError || facesError || !floorplan) throw new Error("Floorplan unavailable");

  const faceRevisions = Object.fromEntries((walls ?? []).map((wall) => [wall.id, Number(wall.faces_revision)]));
  return <div className="mx-auto max-w-[100rem]"><div className="mb-6"><p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--muted)]">Digital twin · Phase 2</p><h1 className="mt-2 text-4xl font-black">{gym.name} floorplan</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Draw physical wall structures, then select one to define its ordered climbing faces and measurements.</p></div><FloorplanEditor configuration={{ widthMetres: Number(floorplan.width_metres), heightMetres: Number(floorplan.height_metres), gridSizeMetres: Number(floorplan.grid_size_metres), showGrid: floorplan.show_grid, snapToGrid: floorplan.snap_to_grid }} floorplanId={floorplan.id} gymSlug={gym.slug} initialFaceRevisions={faceRevisions} initialFaces={(faces ?? []).filter((face): face is typeof face & { wall_structure_id: string; width_metres: number; height_metres: number; climbing_angle_degrees: number } => face.wall_structure_id !== null && face.width_metres !== null && face.height_metres !== null && face.climbing_angle_degrees !== null).map((face) => ({ id: face.id, structureId: face.wall_structure_id, name: face.name, widthMetres: Number(face.width_metres), heightMetres: Number(face.height_metres), climbingAngleDegrees: Number(face.climbing_angle_degrees), notes: face.description ?? "", sortOrder: face.sort_order, createdAt: face.created_at, routeCount: face.routes.length }))} initialRevision={Number(floorplan.revision)} initialWalls={(walls ?? []).map((wall) => ({ id: wall.id, name: wall.name, start: { x: Number(wall.start_x_metres), y: Number(wall.start_y_metres) }, end: { x: Number(wall.end_x_metres), y: Number(wall.end_y_metres) }, thicknessMetres: Number(wall.thickness_metres), createdAt: wall.created_at }))}/></div>;
}

import { MemberGymMap } from "@/components/member-gym-map";
import type { MemberMapStructure } from "@/features/floorplan/member-map";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export default async function GymHome({ params }: { params: Promise<{ gymSlug: string }> }) {
  const { gymSlug } = await params;
  const { gym } = await requireActiveGymContext({ gymSlug });
  const supabase = await createServerComponentSupabaseClient();
  const [{ data: details }, { data: floorplan }, { data: structureRows }, { data: faceRows }] = await Promise.all([
    supabase.from("gyms").select("name").eq("id", gym.id).single(),
    supabase.from("gym_floorplans").select("id,width_metres,height_metres,grid_size_metres,show_grid").eq("gym_id", gym.id).maybeSingle(),
    supabase.from("wall_structures").select("id,floorplan_id,name,start_x_metres,start_y_metres,end_x_metres,end_y_metres,thickness_metres").eq("gym_id", gym.id).is("archived_at", null).order("created_at"),
    supabase.from("walls").select("id,wall_structure_id,name,width_metres,height_metres,climbing_angle_degrees").eq("gym_id", gym.id).eq("is_active", true).is("archived_at", null).not("wall_structure_id", "is", null).order("sort_order").order("id"),
  ]);

  const facesByStructure = new Map<string, MemberMapStructure["faces"]>();
  for (const face of faceRows ?? []) {
    if (!face.wall_structure_id || face.width_metres === null || face.height_metres === null || face.climbing_angle_degrees === null) continue;
    facesByStructure.set(face.wall_structure_id, [...(facesByStructure.get(face.wall_structure_id) ?? []), {
      id: face.id,
      name: face.name,
      widthMetres: Number(face.width_metres),
      heightMetres: Number(face.height_metres),
      angleDegrees: Number(face.climbing_angle_degrees),
      routeCount: 0,
    }]);
  }
  const structures: MemberMapStructure[] = (structureRows ?? []).filter((structure) => !floorplan || structure.floorplan_id === floorplan.id).map((structure) => ({
    id: structure.id,
    name: structure.name,
    start: { x: Number(structure.start_x_metres), y: Number(structure.start_y_metres) },
    end: { x: Number(structure.end_x_metres), y: Number(structure.end_y_metres) },
    thicknessMetres: Number(structure.thickness_metres),
    faces: facesByStructure.get(structure.id) ?? [],
  }));

  return <MemberGymMap
    configuration={{
      widthMetres: Number(floorplan?.width_metres ?? 60),
      heightMetres: Number(floorplan?.height_metres ?? 40),
      gridSizeMetres: Number(floorplan?.grid_size_metres ?? 1),
      showGrid: floorplan?.show_grid ?? true,
    }}
    gymName={details?.name ?? gym.name}
    gymSlug={gym.slug}
    role={gym.role}
    structures={structures}
  />;
}

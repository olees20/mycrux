import { MemberGymMap } from "@/components/member-gym-map";
import { MemberGymExperience } from "@/components/member-gym-experience";
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
    supabase.from("wall_structures").select("id,floorplan_id,name,start_x_metres,start_y_metres,end_x_metres,end_y_metres,thickness_metres,base_elevation_metres").eq("gym_id", gym.id).is("archived_at", null).order("created_at"),
    supabase.from("walls").select("id,wall_structure_id,name,width_metres,height_metres,climbing_angle_degrees,surface_kind,profile_preset,facing_direction,local_offset_u_metres,local_offset_v_metres,local_offset_depth_metres,material_colour,wall_face_vertices(vertex_order,local_u_metres,local_v_metres,local_depth_metres)").eq("gym_id", gym.id).eq("is_active", true).is("archived_at", null).not("wall_structure_id", "is", null).order("sort_order").order("id"),
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
      surfaceKind: face.surface_kind as "rectangle"|"triangle_left"|"triangle_right"|"quadrilateral"|"custom",
      profile: face.profile_preset as "vertical"|"slab"|"overhang"|"steep"|"roof"|"left_facet"|"right_facet"|"custom",
      facingDirection: face.facing_direction as -1|1,
      localOffset: { x: Number(face.local_offset_u_metres), y: Number(face.local_offset_v_metres), z: Number(face.local_offset_depth_metres) },
      materialColour: face.material_colour,
      vertices: [...face.wall_face_vertices].sort((a,b)=>a.vertex_order-b.vertex_order).map((vertex)=>({u:Number(vertex.local_u_metres),v:Number(vertex.local_v_metres),depth:Number(vertex.local_depth_metres)})),
    }]);
  }
  const structures: MemberMapStructure[] = (structureRows ?? []).filter((structure) => !floorplan || structure.floorplan_id === floorplan.id).map((structure) => ({
    id: structure.id,
    name: structure.name,
    start: { x: Number(structure.start_x_metres), y: Number(structure.start_y_metres) },
    end: { x: Number(structure.end_x_metres), y: Number(structure.end_y_metres) },
    thicknessMetres: Number(structure.thickness_metres),
    baseElevationMetres: Number(structure.base_elevation_metres),
    faces: facesByStructure.get(structure.id) ?? [],
  }));

  const props = {
    configuration: {
      widthMetres: Number(floorplan?.width_metres ?? 60),
      heightMetres: Number(floorplan?.height_metres ?? 40),
      gridSizeMetres: Number(floorplan?.grid_size_metres ?? 1),
      showGrid: floorplan?.show_grid ?? true,
    },
    gymName: details?.name ?? gym.name,
    gymSlug: gym.slug,
    role: gym.role,
    structures,
  };
  return process.env.NEXT_PUBLIC_ENABLE_3D_GYM === "false" ? <MemberGymMap {...props}/> : <MemberGymExperience {...props}/>;
}

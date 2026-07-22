import Link from "next/link";
import { notFound } from "next/navigation";
import { WallCanvasEditor } from "@/components/wall-canvas-editor";
import { RouteCreationEditor } from "@/components/route-creation-editor";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import { holdCategories, holdConditions, type HoldCategory, type HoldCondition, type HoldInventoryEvent, type HoldMetadata } from "@/features/floorplan/holds";
import type { Json } from "@/lib/supabase/database.types";
import type { HoldBasedRouteType, RouteHistorySummary } from "@/features/routes/definitions";

function holdMetadata(value: Json, inventory: { colour: string; manufacturer: string | null; model: string | null; purchased_on: string | null; condition: string }): HoldMetadata {
  const document = value && !Array.isArray(value) && typeof value === "object" ? value : {};
  return { label: typeof document.label === "string" ? document.label : "", colour: inventory.colour, manufacturer: inventory.manufacturer ?? "", model: inventory.model ?? "", purchaseDate: inventory.purchased_on ?? "", condition: holdConditions.includes(inventory.condition as HoldCondition) ? inventory.condition as HoldCondition : "good", notes: typeof document.notes === "string" ? document.notes : "" };
}

function routeDefaults(settings: Json) {
  const fallback = { gradeSystem: "font", grade: "6A", routeType: "boulder" as HoldBasedRouteType };
  if (!settings || Array.isArray(settings) || typeof settings !== "object") return fallback;
  const value = settings.route_defaults;
  if (!value || Array.isArray(value) || typeof value !== "object") return fallback;
  const routeType = value.default_route_type;
  return { gradeSystem: typeof value.default_grade_system === "string" ? value.default_grade_system : fallback.gradeSystem, grade: typeof value.default_grade === "string" ? value.default_grade : fallback.grade, routeType: typeof routeType === "string" && ["boulder","sport","top_rope","trad","training"].includes(routeType) ? routeType as HoldBasedRouteType : fallback.routeType };
}

export default async function WallCanvasPage({ params }: { params: Promise<{ gymSlug: string; faceId: string }> }) {
  const { gymSlug, faceId } = await params;
  const { gym } = await requireActiveGymContext({ gymSlug, allowedRoles: ["owner", "staff", "route_setter"] });
  const supabase = await createServerComponentSupabaseClient();
  if (gym.role === "staff") {
    const { data: membership } = await supabase.from("gym_memberships").select("staff_role_id").eq("id", gym.membershipId).single();
    const { data: role } = membership?.staff_role_id ? await supabase.from("staff_roles").select("capabilities").eq("id", membership.staff_role_id).single() : { data: null };
    if (!role?.capabilities.includes("routes.manage")) notFound();
  }
  const [{ data: face, error }, { data: routeRows }, { data: assignments }, { data: versions }, { data: memberships }, { data: settings }, { data: inventoryEvents }] = await Promise.all([
    supabase.from("walls").select("id,name,width_metres,height_metres,climbing_angle_degrees,canvas_grid_size_metres,canvas_show_grid,canvas_snap_to_grid,canvas_revision,holds_revision,wall_structures(name),wall_holds(id,category,icon_key,position_x_metres,position_y_metres,rotation_degrees,scale_factor,metadata,manufacturer,model,colour,purchased_on,condition,created_at)").eq("id", faceId).eq("gym_id", gym.id).eq("is_active", true).is("archived_at", null).not("wall_structure_id", "is", null).single(),
    supabase.from("routes").select("id,name,colour,grade_system,grade,route_type,status,setter_id,set_on,retire_on,description,history_revision,duplicated_from_route_id,route_tags(tag)").eq("gym_id", gym.id).eq("wall_id", faceId).order("created_at", { ascending: false }),
    supabase.from("route_holds").select("route_id,hold_id,routes!inner(wall_id)").eq("gym_id", gym.id).eq("routes.wall_id", faceId),
    supabase.from("route_versions").select("id,route_id,version,change_kind,changed_at,changed_fields,grade,setter_name,wall_name,set_on,retired_at,archived_at,hold_count,routes!inner(wall_id)").eq("gym_id", gym.id).eq("routes.wall_id", faceId).order("version", { ascending: false }).limit(500),
    supabase.from("gym_memberships").select("profile_id").eq("gym_id", gym.id).eq("status", "active").in("role", ["owner","staff","route_setter"]),
    supabase.from("gyms").select("settings").eq("id", gym.id).single(),
    supabase.from("hold_inventory_events").select("id,hold_id,event_type,route_id,created_at,routes(name),wall_holds!inner(wall_id)").eq("gym_id", gym.id).eq("wall_holds.wall_id", faceId).order("created_at", { ascending: false }).limit(1000),
  ]);
  if (error || !face || face.width_metres === null || face.height_metres === null || face.climbing_angle_degrees === null) notFound();
  const holds = face.wall_holds.filter((hold): hold is typeof hold & { category: HoldCategory; icon_key: HoldCategory } => holdCategories.includes(hold.category as HoldCategory) && holdCategories.includes(hold.icon_key as HoldCategory)).map((hold) => ({ id: hold.id, category: hold.category, iconKey: hold.icon_key, position: { x: Number(hold.position_x_metres), y: Number(hold.position_y_metres) }, rotationDegrees: Number(hold.rotation_degrees), scaleFactor: Number(hold.scale_factor), metadata: holdMetadata(hold.metadata, hold), createdAt: hold.created_at }));
  const profileIds = memberships?.map(({ profile_id }) => profile_id) ?? [];
  const { data: profiles } = profileIds.length ? await supabase.from("profiles").select("id,display_name").in("id", profileIds) : { data: [] };
  const holdsByRoute = new Map<string,string[]>();
  for (const assignment of assignments ?? []) holdsByRoute.set(assignment.route_id, [...(holdsByRoute.get(assignment.route_id) ?? []), assignment.hold_id]);
  const initialRouteAssignments: Record<string,string[]> = Object.fromEntries(holds.map((hold) => [hold.id,[]]));
  for (const assignment of assignments ?? []) initialRouteAssignments[assignment.hold_id] = [...(initialRouteAssignments[assignment.hold_id] ?? []),assignment.route_id];
  const inventoryHistory: Record<string,HoldInventoryEvent[]> = {};
  for (const event of inventoryEvents ?? []) inventoryHistory[event.hold_id] = [...(inventoryHistory[event.hold_id] ?? []), { id: Number(event.id), eventType: event.event_type, routeName: event.routes?.name ?? null, wallName: face.name, createdAt: event.created_at }];
  const historyByRoute = new Map<string,RouteHistorySummary[]>();
  for (const version of versions ?? []) {
    const item = { version: Number(version.version), changeKind: version.change_kind as RouteHistorySummary["changeKind"], changedAt: version.changed_at, holdCount: Number(version.hold_count), changedFields: version.changed_fields, grade: version.grade, setterName: version.setter_name ?? "Unassigned", wallName: version.wall_name, setOn: version.set_on ?? "", dateRemoved: version.retired_at ?? "", dateArchived: version.archived_at ?? "" };
    historyByRoute.set(version.route_id, [...(historyByRoute.get(version.route_id) ?? []), item]);
  }
  const routes = (routeRows ?? []).map((route) => ({ id: route.id, name: route.name ?? `${route.colour} ${route.grade}`, colour: route.colour, gradeSystem: route.grade_system, grade: route.grade, routeType: route.route_type as HoldBasedRouteType, status: route.status as "draft"|"published"|"retired"|"archived", setterId: route.setter_id ?? "", setOn: route.set_on ?? "", retireOn: route.retire_on ?? "", description: route.description ?? "", tags: route.route_tags.map(({ tag }) => tag), holdIds: holdsByRoute.get(route.id) ?? [], historyRevision: Number(route.history_revision), history: historyByRoute.get(route.id) ?? [], duplicatedFromRouteId: route.duplicated_from_route_id }));
  return <div className="mx-auto max-w-[100rem]"><Link className="inline-flex min-h-11 items-center text-sm font-bold underline" href={gym.role === "owner" ? `/g/${gym.slug}/staff/floorplan` : `/g/${gym.slug}/staff/routes`}>← Back</Link><div className="mb-6 mt-3"><p className="app-eyebrow text-[var(--muted)]">Digital twin · Holds and routes</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-.035em]">{face.name} wall editor</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Physical holds exist independently. Routes select those reusable holds and preserve every revision.</p></div>{gym.role === "owner" ? <WallCanvasEditor angleDegrees={Number(face.climbing_angle_degrees)} configuration={{ gridSizeMetres: Number(face.canvas_grid_size_metres), showGrid: face.canvas_show_grid, snapToGrid: face.canvas_snap_to_grid }} faceId={face.id} faceName={face.name} gymSlug={gym.slug} heightMetres={Number(face.height_metres)} holdsRevision={Number(face.holds_revision)} initialHolds={holds} initialRevision={Number(face.canvas_revision)} initialRouteAssignments={initialRouteAssignments} inventoryHistory={inventoryHistory} routes={routes} structureName={face.wall_structures?.name ?? "Wall structure"} widthMetres={Number(face.width_metres)}/> : null}<RouteCreationEditor defaults={routeDefaults(settings?.settings ?? null)} faceId={face.id} faceName={face.name} gymSlug={gym.slug} heightMetres={Number(face.height_metres)} holds={holds} initialRoutes={routes} key={routes.map((route) => `${route.id}:${route.historyRevision}`).join("|")} setters={(profiles ?? []).map((profile) => ({ id: profile.id, label: profile.display_name }))} widthMetres={Number(face.width_metres)}/></div>;
}

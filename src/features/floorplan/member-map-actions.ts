"use server";

import { z } from "zod";
import { holdCategories, type HoldCategory } from "./holds";
import type { MemberFaceDetail } from "./member-map";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

const inputSchema = z.object({ gymSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), faceId: z.uuid() });
const pageSize = 500;

function chunks<T>(values: T[], size = 200) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
}

export async function loadMemberFaceAction(input: z.input<typeof inputSchema>): Promise<MemberFaceDetail> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "This climbing face is invalid." };
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.data.gymSlug });
  const supabase = await createServerComponentSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to explore this wall." };

  const [faceResult, firstRoutes, firstAssignments, sessionsResult] = await Promise.all([
    supabase.from("walls").select("id,name,width_metres,height_metres,climbing_angle_degrees").eq("id", parsed.data.faceId).eq("gym_id", gym.id).eq("is_active", true).is("archived_at", null).not("wall_structure_id", "is", null).single(),
    supabase.from("routes").select("id,name,colour,grade,grade_system,route_type,setter_id,set_on,retire_on,description,route_tags(tag)").eq("gym_id", gym.id).eq("wall_id", parsed.data.faceId).eq("status", "published").is("archived_at", null).order("set_on", { ascending: false }).order("id").range(0, pageSize - 1),
    supabase.from("route_holds").select("route_id,hold_id,routes!inner(wall_id,status,archived_at)").eq("gym_id", gym.id).eq("routes.wall_id", parsed.data.faceId).eq("routes.status", "published").is("routes.archived_at", null).order("route_id").order("hold_id").range(0, pageSize - 1),
    supabase.from("climbing_sessions").select("id,session_date").eq("gym_id", gym.id).eq("profile_id", user.id).order("session_date", { ascending: false }).limit(20),
  ]);
  const face = faceResult.data;
  if (faceResult.error || !face || face.width_metres === null || face.height_metres === null || face.climbing_angle_degrees === null) return { status: "error", message: "This climbing face is unavailable." };
  if (firstRoutes.error || firstAssignments.error || sessionsResult.error) return { status: "error", message: "This wall’s routes could not be loaded. Try again." };

  const routeRows = [...(firstRoutes.data ?? [])];
  for (let from = pageSize; routeRows.length === from; from += pageSize) {
    const page = await supabase.from("routes").select("id,name,colour,grade,grade_system,route_type,setter_id,set_on,retire_on,description,route_tags(tag)").eq("gym_id", gym.id).eq("wall_id", face.id).eq("status", "published").is("archived_at", null).order("set_on", { ascending: false }).order("id").range(from, from + pageSize - 1);
    if (page.error) return { status: "error", message: "This wall’s routes could not be loaded. Try again." };
    routeRows.push(...(page.data ?? []));
    if ((page.data?.length ?? 0) < pageSize) break;
  }
  const assignments = [...(firstAssignments.data ?? [])];
  for (let from = pageSize; assignments.length === from; from += pageSize) {
    const page = await supabase.from("route_holds").select("route_id,hold_id,routes!inner(wall_id,status,archived_at)").eq("gym_id", gym.id).eq("routes.wall_id", face.id).eq("routes.status", "published").is("routes.archived_at", null).order("route_id").order("hold_id").range(from, from + pageSize - 1);
    if (page.error) return { status: "error", message: "This wall’s route holds could not be loaded. Try again." };
    assignments.push(...(page.data ?? []));
    if ((page.data?.length ?? 0) < pageSize) break;
  }

  const routeIds = routeRows.map(({ id }) => id);
  const holdIds = [...new Set(assignments.map(({ hold_id }) => hold_id))];
  const setterIds = [...new Set(routeRows.flatMap(({ setter_id }) => setter_id ? [setter_id] : []))];
  const [holdResults, setterResults, favouriteResults, feedbackResults] = await Promise.all([
    Promise.all(chunks(holdIds).map((ids) => supabase.from("wall_holds").select("id,category,icon_key,position_x_metres,position_y_metres,rotation_degrees,scale_factor,colour,metadata").eq("gym_id", gym.id).eq("wall_id", face.id).is("archived_at", null).in("id", ids))),
    Promise.all(chunks(setterIds).map((ids) => supabase.from("profiles").select("id,display_name").in("id", ids))),
    Promise.all(chunks(routeIds).map((ids) => supabase.from("favourites").select("route_id").eq("gym_id", gym.id).eq("profile_id", user.id).in("route_id", ids))),
    Promise.all(chunks(routeIds).map((ids) => supabase.from("route_feedback").select("route_id,feedback_kind").eq("gym_id", gym.id).eq("profile_id", user.id).is("archived_at", null).in("route_id", ids))),
  ]);
  if ([...holdResults, ...setterResults, ...favouriteResults, ...feedbackResults].some(({ error }) => error)) return { status: "error", message: "This wall’s details could not be loaded. Try again." };
  const holdRows = holdResults.flatMap(({ data }) => data ?? []);
  const setters = setterResults.flatMap(({ data }) => data ?? []);
  const favourites = favouriteResults.flatMap(({ data }) => data ?? []);
  const feedback = feedbackResults.flatMap(({ data }) => data ?? []);

  const holdsByRoute = new Map<string, string[]>();
  for (const item of assignments) holdsByRoute.set(item.route_id, [...(holdsByRoute.get(item.route_id) ?? []), item.hold_id]);
  const setterNames = new Map(setters.map((item) => [item.id, item.display_name]));
  const favouriteIds = new Set(favourites.map(({ route_id }) => route_id));
  const feedbackByRoute = new Map<string, string[]>();
  for (const item of feedback) feedbackByRoute.set(item.route_id, [...(feedbackByRoute.get(item.route_id) ?? []), item.feedback_kind]);
  const holds = holdRows.filter((hold): hold is typeof hold & { category: HoldCategory; icon_key: HoldCategory } => holdCategories.includes(hold.category as HoldCategory) && holdCategories.includes(hold.icon_key as HoldCategory)).map((hold) => {
    const metadata = hold.metadata && !Array.isArray(hold.metadata) && typeof hold.metadata === "object" ? hold.metadata : {};
    return { id: hold.id, category: hold.category, iconKey: hold.icon_key, position: { x: Number(hold.position_x_metres), y: Number(hold.position_y_metres) }, rotationDegrees: Number(hold.rotation_degrees), scaleFactor: Number(hold.scale_factor), colour: hold.colour, label: typeof metadata.label === "string" ? metadata.label : "" };
  });

  return {
    status: "success",
    face: { id: face.id, name: face.name, widthMetres: Number(face.width_metres), heightMetres: Number(face.height_metres), angleDegrees: Number(face.climbing_angle_degrees), routeCount: routeRows.length },
    holds,
    routes: routeRows.map((route) => ({ id: route.id, name: route.name ?? `${route.colour} ${route.grade}`, colour: route.colour, grade: route.grade, gradeSystem: route.grade_system, discipline: route.route_type, setterName: route.setter_id ? setterNames.get(route.setter_id) ?? "Unassigned" : "Unassigned", setOn: route.set_on ?? "", retireOn: route.retire_on ?? "", description: route.description ?? "", tags: route.route_tags.map(({ tag }) => tag), holdIds: holdsByRoute.get(route.id) ?? [], favourite: favouriteIds.has(route.id), submittedFeedback: feedbackByRoute.get(route.id) ?? [] })),
    sessions: sessionsResult.data ?? [],
  };
}

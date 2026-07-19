import { notFound } from "next/navigation";
import { RouteForm } from "@/components/route-form";
import { WallForm } from "@/components/wall-form";
import { WallImageForm } from "@/components/wall-image-form";
import { archiveWallAction, bulkRouteAction } from "@/features/routes/actions";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

function routeDefaults(settings: Json) {
  if (!settings || Array.isArray(settings) || typeof settings !== "object") return undefined;
  const value = settings.route_defaults;
  if (!value || Array.isArray(value) || typeof value !== "object") return undefined;
  const routeType = value.default_route_type;
  if (typeof value.default_grade_system !== "string" || typeof value.default_grade !== "string" || typeof routeType !== "string" || !["boulder", "sport", "top_rope", "trad", "training"].includes(routeType)) return undefined;
  return { gradeSystem: value.default_grade_system, grade: value.default_grade, routeType: routeType as "boulder" | "sport" | "top_rope" | "trad" | "training" };
}

export default async function StaffRoutesPage({ params }: { params: Promise<{ gymSlug: string }> }) {
  const { gymSlug } = await params;
  const { gym } = await requireActiveGymContext({ gymSlug, allowedRoles: ["owner", "staff", "route_setter"] });
  const supabase = await createServerComponentSupabaseClient();
  if (gym.role === "staff") {
    const { data: membership } = await supabase.from("gym_memberships").select("staff_role_id").eq("id", gym.membershipId).single();
    const { data: role } = membership?.staff_role_id ? await supabase.from("staff_roles").select("capabilities").eq("id", membership.staff_role_id).single() : { data: null };
    if (!role?.capabilities.includes("routes.manage")) notFound();
  }
  const [{ data: walls }, { data: routes }, { data: memberships }, { data: gymSettings }] = await Promise.all([
    supabase.from("walls").select("id,name,description,sort_order,is_active,archived_at,wall_images(id,storage_path,alt_text,width,height,version,is_current,archived_at)").eq("gym_id", gym.id).order("sort_order"),
    supabase.from("routes").select("id,wall_id,wall_image_id,name,colour,grade_system,grade,route_type,status,setter_id,set_on,retire_on,description,overlay,created_at,route_tags(tag),route_media(id)").eq("gym_id", gym.id).order("created_at", { ascending: false }),
    supabase.from("gym_memberships").select("profile_id").eq("gym_id", gym.id).eq("status", "active").in("role", ["owner", "staff", "route_setter"]),
    supabase.from("gyms").select("settings").eq("id", gym.id).single(),
  ]);
  const profileIds = memberships?.map(({ profile_id }) => profile_id) ?? [];
  const { data: profiles } = profileIds.length ? await supabase.from("profiles").select("id,display_name").in("id", profileIds) : { data: [] };
  const activeWalls = (walls ?? []).filter((wall) => wall.is_active && !wall.archived_at);
  const currentImages = new Map(activeWalls.map((wall) => [wall.id, wall.wall_images.find((image) => image.is_current && !image.archived_at) ?? null]));
  const imagePaths = [...currentImages.values()].flatMap((image) => image ? [image.storage_path] : []);
  const { data: signedImages } = imagePaths.length ? await supabase.storage.from("wall-images").createSignedUrls(imagePaths, 60 * 60) : { data: [] };
  const imageUrls = new Map((signedImages ?? []).map((item) => [item.path, item.signedUrl]));
  const wallOptions = activeWalls.map((wall) => {
    const current = currentImages.get(wall.id) ?? null;
    return { id: wall.id, name: wall.name, imageId: current?.id ?? null, imageUrl: current ? imageUrls.get(current.storage_path) ?? null : null, imageAlt: current?.alt_text ?? null, imageWidth: current?.width ?? null, imageHeight: current?.height ?? null };
  });
  const setters = (profiles ?? []).map((profile) => ({ id: profile.id, label: profile.display_name }));
  const routeValues = (routes ?? []).map((route) => ({ ...route, route_type: route.route_type as "boulder" | "sport" | "top_rope" | "trad" | "training", status: route.status as "draft" | "published" | "retired" | "archived", tags: route.route_tags.map(({ tag }) => tag) }));
  const defaults = routeDefaults(gymSettings?.settings ?? null);

  return <div className="mx-auto max-w-6xl">
    <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Setting operations</p><h1 className="mt-3 text-4xl font-black">Walls and routes</h1><p className="mt-3 max-w-3xl text-[var(--muted)]">Current images power normalized overlays. Replacing an image archives the old version, while retiring routes preserves every ascent and historical record.</p>
    <section className="mt-8 rounded-2xl border border-[var(--border)] bg-white p-5"><h2 className="mb-4 text-xl font-black">Add a wall or sector</h2><WallForm gymSlug={gym.slug} /></section>
    <section className="mt-8"><h2 className="text-xl font-black">Wall library</h2><div className="mt-4 grid gap-4 lg:grid-cols-2">{activeWalls.map((wall) => { const history = wall.wall_images.toSorted((a, b) => b.version - a.version); return <article className="rounded-2xl border border-[var(--border)] bg-white p-5" key={wall.id}><WallForm gymSlug={gym.slug} wall={wall} /><p className="mt-3 text-xs text-[var(--muted)]">{history.length ? `${history.length} image version${history.length === 1 ? "" : "s"} · current v${history.find((image) => image.is_current && !image.archived_at)?.version ?? "—"}` : "No image uploaded"}</p><WallImageForm gymSlug={gym.slug} wallId={wall.id} /><form action={archiveWallAction} className="mt-3"><input name="gymSlug" type="hidden" value={gym.slug} /><input name="wallId" type="hidden" value={wall.id} /><button className="text-sm font-bold text-red-700">Archive wall</button></form></article>; })}{activeWalls.length ? null : <p className="rounded-2xl bg-white p-5 text-sm text-[var(--muted)]">Create the first wall before adding routes.</p>}</div></section>
    {wallOptions.length ? <><section className="mt-10"><h2 className="mb-4 text-xl font-black">Create a route</h2><RouteForm defaults={defaults} gymSlug={gym.slug} setters={setters} walls={wallOptions} /></section>
    <section className="mt-10"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black">Route library</h2><p className="mt-1 text-sm text-[var(--muted)]">Published routes are member-visible. Retired and archived routes remain historical.</p></div><form action={bulkRouteAction} className="flex gap-2" id="bulk-routes"><input name="gymSlug" type="hidden" value={gym.slug} /><button className="rounded-full bg-black px-4 py-2 text-sm font-bold text-white" name="operation" value="publish">Publish selected</button><button className="rounded-full border px-4 py-2 text-sm font-bold" name="operation" value="retire">Reset / retire selected</button></form></div><div className="mt-4 space-y-4">{routeValues.map((route) => <article key={route.id}><label className="mb-2 flex items-center gap-2 text-sm font-bold"><input form="bulk-routes" name="routeIds" type="checkbox" value={route.id} /> Select · {route.status} · {route.grade} {route.colour} · {route.route_media.length} media</label><RouteForm gymSlug={gym.slug} route={route} setters={setters} walls={wallOptions} /></article>)}{routeValues.length ? null : <p className="rounded-2xl bg-white p-5 text-sm text-[var(--muted)]">No routes yet.</p>}</div></section></> : null}
  </div>;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export default async function RoutePage({ params, searchParams }: { params: Promise<{ gymSlug: string; routeId: string }>; searchParams: Promise<{ from?: string | string[] }> }) {
  const [{ gymSlug, routeId }, search] = await Promise.all([params, searchParams]); const { gym } = await requireActiveGymContext({ gymSlug });
  const supabase = await createServerComponentSupabaseClient(); const { data: route } = await supabase.from("routes").select("id,name,colour,grade_system,grade,route_type,set_on,retire_on,description,walls(name),route_tags(tag)").eq("id", routeId).eq("gym_id", gym.id).eq("status", "published").single();
  if (!route) notFound();
  const candidate = Array.isArray(search.from) ? search.from[0] : search.from; const base = `/g/${gym.slug}/app/routes`; const backHref = candidate?.startsWith(`${base}?`) ? candidate : base;
  return <div className="mx-auto max-w-3xl"><Link className="inline-flex min-h-11 items-center font-bold underline" href={backHref}>← Back to filtered routes</Link><article className="mt-5 rounded-2xl border border-[var(--border)] bg-white p-6"><p className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">{route.walls?.name} · {route.route_type.replace("_", " ")}</p><h1 className="mt-3 text-4xl font-black">{route.name || `${route.colour} ${route.grade}`}</h1><p className="mt-4 text-xl font-bold">{route.grade_system} {route.grade} · {route.colour}</p>{route.description ? <p className="mt-5 text-[var(--muted)]">{route.description}</p> : null}<div className="mt-5 flex flex-wrap gap-2">{route.route_tags.map(({ tag }) => <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-bold" key={tag}>{tag}</span>)}</div>{route.retire_on ? <p className="mt-5 text-sm text-[var(--muted)]">Planned removal: {new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date(`${route.retire_on}T12:00:00Z`))}</p> : null}</article></div>;
}

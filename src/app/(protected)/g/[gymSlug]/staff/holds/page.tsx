import { Select } from "@/components/ui/form-controls";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HoldIcon } from "@/components/hold-icon";
import { holdCategories, holdConditions, type HoldCategory } from "@/features/floorplan/holds";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

const pageSize = 100;

export default async function HoldInventoryPage({ params, searchParams }: { params: Promise<{ gymSlug: string }>; searchParams: Promise<{ page?: string; condition?: string; wall?: string }> }) {
  const [{ gymSlug }, filters] = await Promise.all([params,searchParams]);
  const { gym } = await requireActiveGymContext({ gymSlug, allowedRoles: ["owner","staff","route_setter"] });
  const supabase = await createServerComponentSupabaseClient();
  if (gym.role === "staff") {
    const { data: membership } = await supabase.from("gym_memberships").select("staff_role_id").eq("id",gym.membershipId).single();
    const { data: role } = membership?.staff_role_id ? await supabase.from("staff_roles").select("capabilities").eq("id",membership.staff_role_id).single() : { data: null };
    if (!role?.capabilities.includes("routes.manage")) notFound();
  }
  const page = Math.max(1,Number.parseInt(filters.page ?? "1",10) || 1);
  const selectedCondition = holdConditions.includes(filters.condition as typeof holdConditions[number]) ? filters.condition : "";
  const [{ data: walls }, holdsResult] = await Promise.all([
    supabase.from("walls").select("id,name").eq("gym_id",gym.id).not("wall_structure_id","is",null).order("name"),
    (() => {
      let query = supabase.from("wall_holds").select("id,wall_id,category,icon_key,manufacturer,model,colour,purchased_on,condition,archived_at,updated_at,walls(name),route_holds(route_id,routes(name,status))",{ count:"exact" }).eq("gym_id",gym.id).order("updated_at",{ ascending:false }).range((page-1)*pageSize,page*pageSize-1);
      if (selectedCondition) query=query.eq("condition",selectedCondition);
      if (filters.wall) query=query.eq("wall_id",filters.wall);
      return query;
    })(),
  ]);
  const holds = holdsResult.data ?? [];
  const holdIds = holds.map(({ id }) => id);
  const { data: events } = holdIds.length ? await supabase.from("hold_inventory_events").select("id,hold_id,event_type,created_at,routes(name)").eq("gym_id",gym.id).in("hold_id",holdIds).order("created_at",{ ascending:false }).limit(500) : { data: [] };
  const eventsByHold = new Map<string,typeof events>();
  for (const event of events ?? []) {
    const current=eventsByHold.get(event.hold_id)??[];
    if(current.length<5)eventsByHold.set(event.hold_id,[...current,event]);
  }
  const pageCount=Math.max(1,Math.ceil((holdsResult.count??0)/pageSize));
  const href=(targetPage:number)=>{const query=new URLSearchParams();if(selectedCondition)query.set("condition",selectedCondition);if(filters.wall)query.set("wall",filters.wall);query.set("page",String(targetPage));return `/g/${gym.slug}/staff/holds?${query}`;};
  return <div className="mx-auto max-w-[var(--content)]"><p className="app-eyebrow text-[var(--muted)]">Physical operations</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-.035em]">Hold inventory</h1><p className="mt-3 max-w-3xl text-[var(--muted)]">Each UUID is one real hold. Current walls and route assignments are derived from the digital twin without copying inventory records.</p>
    <form className="mt-6 grid gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-[1fr_1fr_auto]" method="get"><label className="text-sm font-bold">Condition<Select className="mt-1 min-h-11 w-full rounded-[var(--radius-md)] border px-3 font-normal" defaultValue={selectedCondition} name="condition"><option value="">All conditions</option>{holdConditions.map((condition)=><option key={condition} value={condition}>{condition}</option>)}</Select></label><label className="text-sm font-bold">Current wall<Select className="mt-1 min-h-11 w-full rounded-[var(--radius-md)] border px-3 font-normal" defaultValue={filters.wall??""} name="wall"><option value="">All walls</option>{(walls??[]).map((wall)=><option key={wall.id} value={wall.id}>{wall.name}</option>)}</Select></label><button className="min-h-11 self-end rounded-[var(--radius-md)] bg-[var(--primary)] px-5 text-sm font-bold text-white">Apply filters</button></form>
    <div className="mt-6 flex items-center justify-between"><p className="text-sm font-bold">{holdsResult.count??0} physical hold{holdsResult.count===1?"":"s"}</p><p className="text-sm text-[var(--muted)]">Page {page} of {pageCount}</p></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">{holds.map((hold)=>{const category=holdCategories.includes(hold.category as HoldCategory)?hold.category as HoldCategory:"jug";const routes=hold.route_holds.map(({routes})=>routes).filter(Boolean);return <article className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5" key={hold.id}><div className="flex items-start gap-4"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--surface-subtle)]" style={{color:hold.colour}}><HoldIcon category={category} className="h-10 w-10"/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-black">{hold.manufacturer||"Unknown manufacturer"} {hold.model||category}</h2><span className={`rounded-full px-2 py-1 text-xs font-bold ${hold.condition==="damaged"?"bg-red-100 text-red-800":hold.condition==="worn"?"bg-amber-100 text-amber-900":"bg-[var(--surface-subtle)]"}`}>{hold.condition}</span></div><code className="mt-1 block truncate text-[.65rem] text-[var(--muted)]">{hold.id}</code><p className="mt-2 text-sm"><span className="font-bold">Wall:</span> {hold.walls?.name??"Not installed"}</p><p className="mt-1 text-sm"><span className="font-bold">Current routes:</span> {routes.length?routes.map((route)=>route?.name??"Unnamed route").join(", "):"Not assigned"}</p><p className="mt-1 text-sm"><span className="font-bold">Purchased:</span> {hold.purchased_on??"Not recorded"}</p>{hold.archived_at?<p className="mt-2 text-sm font-bold text-red-700">Archived inventory record</p>:null}</div></div><div className="mt-4 border-t pt-3"><h3 className="text-xs font-black uppercase tracking-[.14em] text-[var(--muted)]">Recent history</h3>{eventsByHold.get(hold.id)?.length?<ol className="mt-2 space-y-1">{eventsByHold.get(hold.id)?.map((event)=><li className="text-xs" key={event.id}><span className="font-bold">{event.event_type.replaceAll("_"," ")}</span>{event.routes?.name?` · ${event.routes.name}`:""} <time className="text-[var(--muted)]" dateTime={event.created_at}>· {new Date(event.created_at).toLocaleDateString()}</time></li>)}</ol>:<p className="mt-2 text-xs text-[var(--muted)]">No history recorded.</p>}<Link className="mt-3 inline-flex min-h-11 items-center font-bold underline" href={`/g/${gym.slug}/staff/floorplan/faces/${hold.wall_id}`}>Open on wall</Link></div></article>;})}{holds.length?null:<p className="rounded-[var(--radius-lg)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">No physical holds match these filters.</p>}</div>
    <nav aria-label="Inventory pages" className="mt-6 flex justify-between"><Link aria-disabled={page<=1} className={`rounded-full border px-5 py-3 text-sm font-bold ${page<=1?"pointer-events-none opacity-40":""}`} href={href(Math.max(1,page-1))}>Previous</Link><Link aria-disabled={page>=pageCount} className={`rounded-full border px-5 py-3 text-sm font-bold ${page>=pageCount?"pointer-events-none opacity-40":""}`} href={href(Math.min(pageCount,page+1))}>Next</Link></nav>
  </div>;
}

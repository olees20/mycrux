import { Select } from "@/components/ui/form-controls";
import Link from "next/link";
import { requireFeatureEntitlement } from "@/lib/server/entitlements";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

type Search = { from?: string; to?: string; wall?: string; setter?: string; type?: string };
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export default async function RouteHistoryAnalyticsPage({ params, searchParams }: { params: Promise<{gymSlug:string}>; searchParams: Promise<Search> }) {
  const [{gymSlug},search] = await Promise.all([params,searchParams]);
  const {gym} = await requireActiveGymContext({gymSlug,allowedRoles:["owner","staff","route_setter"]});
  await requireFeatureEntitlement(gym.id,"analytics");
  const supabase = await createServerComponentSupabaseClient();
  const now = new Date();
  const today = now.toISOString().slice(0,10);
  const fallback = new Date(now.getTime()-89*86400000).toISOString().slice(0,10);
  const from = datePattern.test(search.from??"") ? search.from! : fallback;
  const to = datePattern.test(search.to??"") ? search.to! : today;
  const wall = /^[0-9a-f-]{36}$/.test(search.wall??"") ? search.wall : undefined;
  const setter = /^[0-9a-f-]{36}$/.test(search.setter??"") ? search.setter : undefined;
  const routeType = ["boulder","sport","top_rope","trad","training"].includes(search.type??"") ? search.type : undefined;
  const [{data:history,error},{data:walls},{data:memberships}] = await Promise.all([
    supabase.rpc("get_route_history_analytics",{target_gym_id:gym.id,date_from:from,date_to:to,target_wall_id:wall,target_setter_id:setter,target_route_type:routeType}),
    supabase.from("walls").select("id,name").eq("gym_id",gym.id).order("name"),
    supabase.from("gym_memberships").select("profile_id,profiles(display_name)").eq("gym_id",gym.id).eq("status","active").in("role",["owner","staff","route_setter"]),
  ]);
  if(error) throw new Error("Historical route analytics are unavailable or the date range is invalid.");
  const rows=history??[];
  const count=(kind:string)=>rows.filter((row)=>row.change_kind===kind).length;
  return <div className="mx-auto max-w-[var(--content)]">
    <Link className="inline-flex min-h-11 items-center text-sm font-bold underline" href={`/g/${gym.slug}/staff/route-analytics`}>← Current route analytics</Link>
    <div className="mt-3"><p className="app-eyebrow text-[var(--muted)]">Immutable route revisions</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-.035em]">Historical route analytics</h1><p className="mt-3 max-w-4xl text-sm text-[var(--muted)]">Every route definition, lifecycle, wall, tag, and physical-hold modification is retained here, including routes that have since been archived.</p></div>
    <form className="mt-6 grid gap-3 rounded-[var(--radius-lg)] border bg-[var(--surface)] p-5 sm:grid-cols-5"><label className="text-sm font-bold">From<input className="mt-1 w-full rounded-[var(--radius-sm)] border p-2 font-normal" defaultValue={from} name="from" type="date"/></label><label className="text-sm font-bold">To<input className="mt-1 w-full rounded-[var(--radius-sm)] border p-2 font-normal" defaultValue={to} name="to" type="date"/></label><label className="text-sm font-bold">Historical wall<Select className="mt-1 w-full rounded-[var(--radius-sm)] border p-2 font-normal" defaultValue={wall??""} name="wall"><option value="">All</option>{(walls??[]).map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</Select></label><label className="text-sm font-bold">Historical setter<Select className="mt-1 w-full rounded-[var(--radius-sm)] border p-2 font-normal" defaultValue={setter??""} name="setter"><option value="">All</option>{(memberships??[]).map((item)=><option key={item.profile_id} value={item.profile_id}>{item.profiles?.display_name}</option>)}</Select></label><label className="text-sm font-bold">Discipline<Select className="mt-1 w-full rounded-[var(--radius-sm)] border p-2 font-normal" defaultValue={routeType??""} name="type"><option value="">All</option><option value="boulder">Boulder</option><option value="sport">Sport</option><option value="top_rope">Top rope</option><option value="trad">Trad</option><option value="training">Training</option></Select></label><button className="min-h-11 rounded-[var(--radius-sm)] border p-2 font-bold sm:col-span-5">Apply filters</button></form>
    <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[["Modifications",rows.length],["Hold changes",count("hold_change")],["Wall changes",count("wall_change")],["Retirements",count("retire")],["Archives",count("archive")]].map(([label,value])=><article className="rounded-[var(--radius-lg)] border bg-[var(--surface)] p-5" key={label}><p className="text-3xl font-black">{value}</p><h2 className="text-sm font-bold">{label}</h2></article>)}</section>
    <div className="mt-6 overflow-x-auto rounded-[var(--radius-lg)] border bg-[var(--surface)]"><table className="w-full min-w-[75rem] text-left text-sm"><thead><tr className="border-b">{["Changed","Route","Revision","Modification","Fields","Grade","Setter","Wall","Set date","Removed","Holds","Actor"].map((heading)=><th className="p-3" key={heading}>{heading}</th>)}</tr></thead><tbody>{rows.map((row)=><tr className="border-b last:border-0" key={`${row.route_id}-${row.version}`}><td className="p-3"><time dateTime={row.changed_at}>{new Date(row.changed_at).toLocaleString("en-GB")}</time></td><td className="p-3 font-bold">{row.route_name}</td><td className="p-3">v{row.version}</td><td className="p-3 font-bold capitalize">{row.change_kind.replaceAll("_"," ")}</td><td className="p-3">{row.changed_fields.map((field)=>field.replaceAll("_"," ")).join(", ")||"—"}</td><td className="p-3">{row.grade_system} {row.grade}</td><td className="p-3">{row.setter_name}</td><td className="p-3">{row.wall_name}</td><td className="p-3">{row.set_on??"—"}</td><td className="p-3">{row.date_removed?new Date(row.date_removed).toLocaleDateString("en-GB"):"—"}</td><td className="p-3">{row.hold_count}</td><td className="p-3">{row.changed_by_name}</td></tr>)}</tbody></table>{rows.length?null:<p className="p-5 text-sm text-[var(--muted)]">No route modifications match this period.</p>}</div>
  </div>;
}

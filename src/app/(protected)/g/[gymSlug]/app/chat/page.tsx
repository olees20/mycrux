import Link from "next/link";
import { createChannelAction } from "@/features/chat/actions";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export default async function ChatChannelsPage({ params }: { params: Promise<{ gymSlug: string }> }) {
  const { gymSlug } = await params;
  const { gym } = await requireActiveGymContext({ gymSlug });
  const supabase = await createServerComponentSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: channels }, { data: memberships }] = await Promise.all([
    supabase.from("chat_channels").select("id,name,description,channel_type,is_read_only,created_at").eq("gym_id", gym.id).is("archived_at", null).order("created_at"),
    supabase.from("channel_members").select("channel_id,last_read_at").eq("gym_id", gym.id).eq("profile_id", user?.id ?? ""),
  ]);
  const reads = new Map((memberships ?? []).map((membership) => [membership.channel_id, membership.last_read_at]));
  const enriched = await Promise.all((channels ?? []).map(async (channel) => {
    const lastRead = reads.get(channel.id);
    let query = supabase.from("messages").select("id", { count: "exact", head: true }).eq("gym_id", gym.id).eq("channel_id", channel.id);
    if (lastRead) query = query.gt("created_at", lastRead);
    const { count } = await query;
    return { ...channel, unread: count ?? 0 };
  }));
  return <div className="mx-auto max-w-5xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--muted)]">Gym chat</p><h1 className="mt-2 text-4xl font-black">Channels</h1><p className="mt-3 text-[var(--muted)]">Messages stay inside this gym. Private partner conversations only appear to their participants.</p>{gym.role !== "member" ? <section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Create a member channel</h2><form action={createChannelAction} className="mt-4 grid gap-3 sm:grid-cols-2"><input name="gymSlug" type="hidden" value={gym.slug}/><label className="text-sm font-bold">Name<input className="mt-1 w-full rounded-lg border p-3 font-normal" maxLength={80} name="name" required/></label><label className="text-sm font-bold">Description<input className="mt-1 w-full rounded-lg border p-3 font-normal" maxLength={500} name="description"/></label><label className="flex items-center gap-2 text-sm font-bold sm:col-span-2"><input name="readOnly" type="checkbox"/>Read-only announcements channel</label><button className="min-h-11 rounded-lg bg-black px-5 font-bold text-white sm:col-span-2">Create channel</button></form></section> : null}<ul className="mt-7 grid gap-4 sm:grid-cols-2">{enriched.map((channel) => <li key={channel.id}><Link className="block rounded-2xl border bg-white p-5 hover:border-black" href={`/g/${gym.slug}/app/chat/${channel.id}`}><div className="flex justify-between gap-3"><h2 className="text-xl font-black">{channel.name}</h2>{channel.unread ? <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-black">{channel.unread} unread</span> : null}</div><p className="mt-2 text-sm text-[var(--muted)]">{channel.description || (channel.channel_type === "partner" ? "Private partner conversation" : "Gym member channel")}</p>{channel.is_read_only ? <span className="mt-3 inline-block text-xs font-bold uppercase">Read only</span> : null}</Link></li>)}</ul>{!enriched.length ? <p className="mt-7 rounded-2xl bg-stone-100 p-6">No channels are available yet.</p> : null}</div>;
}

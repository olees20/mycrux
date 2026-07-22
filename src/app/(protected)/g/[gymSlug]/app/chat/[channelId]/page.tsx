import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatThread, type ChatMessage } from "@/components/chat-thread";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export default async function ChatChannelPage({ params }: { params: Promise<{ gymSlug: string; channelId: string }> }) {
  const { gymSlug, channelId } = await params;
  const { gym } = await requireActiveGymContext({ gymSlug });
  const supabase = await createServerComponentSupabaseClient();
  const [{ data: channel }, { data: messages }, { data: { user } }] = await Promise.all([
    supabase.from("chat_channels").select("id,name,description,is_read_only,channel_type").eq("gym_id", gym.id).eq("id", channelId).maybeSingle(),
    supabase.from("messages").select("id,body,sender_id,created_at,edited_at,deleted_at,moderation_status,profiles(display_name)").eq("gym_id", gym.id).eq("channel_id", channelId).order("created_at", { ascending: false }).limit(50),
    supabase.auth.getUser(),
  ]);
  if (!channel || !user) notFound();
  return <div className="mx-auto max-w-4xl"><Link className="text-sm font-bold underline" href={`/g/${gym.slug}/app/chat`}>← All channels</Link><div className="my-5"><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--muted)]">{channel.channel_type === "partner" ? "Private partner thread" : "Gym chat"}</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-.035em]">{channel.name}</h1>{channel.description ? <p className="mt-2 text-[var(--muted)]">{channel.description}</p> : null}</div><ChatThread channelId={channel.id} currentUserId={user.id} gymId={gym.id} gymSlug={gym.slug} initialMessages={[...(messages ?? [])].reverse() as ChatMessage[]} readOnly={channel.is_read_only && gym.role === "member"}/></div>;
}

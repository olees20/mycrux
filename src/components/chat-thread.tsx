"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteMessageAction, editMessageAction, reportMessageAction, sendMessageAction } from "@/features/chat/actions";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export type ChatMessage = { id: string; body: string; sender_id: string; created_at: string; edited_at: string | null; deleted_at: string | null; moderation_status: string; profiles: { display_name: string } | null };

export function ChatThread({ gymId, gymSlug, channelId, currentUserId, initialMessages, readOnly }: { gymId: string; gymSlug: string; channelId: string; currentUserId: string; initialMessages: ChatMessage[]; readOnly: boolean }) {
  const [messages, setMessages] = useState(initialMessages);
  const [connection, setConnection] = useState<"connecting" | "live" | "offline">("connecting");
  const [hasOlder, setHasOlder] = useState(initialMessages.length === 50);
  const supabase = createBrowserSupabaseClient();
  const refresh = useCallback(async () => {
    const { data } = await supabase.from("messages").select("id,body,sender_id,created_at,edited_at,deleted_at,moderation_status,profiles(display_name)").eq("gym_id", gymId).eq("channel_id", channelId).order("created_at", { ascending: false }).limit(50);
    if (data) setMessages([...data].reverse());
  }, [channelId, gymId, supabase]);

  useEffect(() => {
    void supabase.rpc("mark_channel_read", { target_gym_id: gymId, target_channel_id: channelId });
    const channel = supabase.channel(`chat:${gymId}:${channelId}`).on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` }, () => { void refresh(); }).subscribe((status) => setConnection(status === "SUBSCRIBED" ? "live" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED" ? "offline" : "connecting"));
    return () => { void supabase.removeChannel(channel); };
  }, [channelId, gymId, refresh, supabase]);

  async function loadOlder() {
    const oldest = messages[0]?.created_at;
    if (!oldest) return;
    const { data } = await supabase.from("messages").select("id,body,sender_id,created_at,edited_at,deleted_at,moderation_status,profiles(display_name)").eq("gym_id", gymId).eq("channel_id", channelId).lt("created_at", oldest).order("created_at", { ascending: false }).limit(50);
    if (data) { setMessages((current) => [...[...data].reverse(), ...current]); setHasOlder(data.length === 50); }
  }

  return <div>
    <div className="mb-4 flex items-center justify-between gap-3 text-xs"><span aria-live="polite" className={connection === "live" ? "text-emerald-700" : "text-amber-700"}>{connection === "live" ? "Live updates connected" : connection === "offline" ? "Realtime unavailable — messages still work; refresh manually" : "Connecting live updates…"}</span>{connection !== "live" ? <button className="font-bold underline" onClick={() => void refresh()} type="button">Refresh messages</button> : null}</div>
    {hasOlder ? <button className="mb-4 rounded-lg border px-4 py-2 text-sm font-bold" onClick={() => void loadOlder()} type="button">Load older messages</button> : null}
    <ol className="space-y-3">{messages.map((message) => <li className="rounded-xl border bg-white p-4" key={message.id}><div className="flex justify-between gap-3"><strong>{message.profiles?.display_name ?? "Gym member"}</strong><time className="text-xs text-[var(--muted)]">{new Date(message.created_at).toLocaleString("en-GB")}</time></div><p className={`mt-2 whitespace-pre-wrap ${message.deleted_at ? "italic text-[var(--muted)]" : ""}`}>{message.moderation_status === "hidden" ? "[hidden by gym staff]" : message.body}</p>{message.edited_at && !message.deleted_at ? <span className="text-xs text-[var(--muted)]">edited</span> : null}<div className="mt-3 flex flex-wrap gap-3 text-xs">{message.sender_id === currentUserId && !message.deleted_at ? <details><summary className="cursor-pointer font-bold underline">Edit</summary><form action={editMessageAction} className="mt-2 flex gap-2"><input name="gymSlug" type="hidden" value={gymSlug}/><input name="channelId" type="hidden" value={channelId}/><input name="messageId" type="hidden" value={message.id}/><input className="rounded-lg border p-2" defaultValue={message.body} maxLength={5000} name="body" required/><button className="font-bold">Save</button></form></details> : null}{message.sender_id === currentUserId && !message.deleted_at ? <form action={deleteMessageAction}><input name="gymSlug" type="hidden" value={gymSlug}/><input name="channelId" type="hidden" value={channelId}/><input name="messageId" type="hidden" value={message.id}/><button className="font-bold text-red-700 underline">Delete</button></form> : null}<details><summary className="cursor-pointer font-bold underline">Report</summary><form action={reportMessageAction} className="mt-2 flex gap-2"><input name="gymSlug" type="hidden" value={gymSlug}/><input name="channelId" type="hidden" value={channelId}/><input name="messageId" type="hidden" value={message.id}/><input className="rounded-lg border p-2" minLength={3} name="reason" required/><button className="font-bold">Report</button></form></details></div></li>)}</ol>
    {!readOnly ? <form action={sendMessageAction} className="sticky bottom-3 mt-5 flex gap-2 rounded-xl border bg-white p-3 shadow-lg"><input name="gymSlug" type="hidden" value={gymSlug}/><input name="channelId" type="hidden" value={channelId}/><textarea aria-label="Message" className="min-h-12 min-w-0 flex-1 resize-y rounded-lg border p-3" maxLength={5000} name="body" placeholder="Message this gym channel" required/><button className="rounded-lg bg-black px-5 font-bold text-white">Send</button></form> : <p className="mt-5 rounded-xl bg-stone-100 p-4 text-sm font-bold">Only gym staff can post in this read-only channel.</p>}
  </div>;
}

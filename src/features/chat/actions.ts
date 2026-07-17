"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const context = z.object({ gymSlug: slug, channelId: z.uuid().optional() });

async function clientFor(gymSlug: string) {
  const { gym } = await requireActiveGymContext({ gymSlug });
  return { gym, supabase: await createServerComponentSupabaseClient() };
}

export async function createChannelAction(formData: FormData) {
  const parsed = z.object({ gymSlug: slug, name: z.string().trim().min(1).max(80), description: z.string().trim().max(500), readOnly: z.string().optional() }).parse(Object.fromEntries(formData.entries()));
  const { gym, supabase } = await clientFor(parsed.gymSlug);
  const { data, error } = await supabase.rpc("create_chat_channel", { target_gym_id: gym.id, channel_name: parsed.name, channel_description: parsed.description, read_only: parsed.readOnly === "on" });
  if (error) throw new Error(error.message);
  redirect(`/g/${gym.slug}/app/chat/${data}`);
}

export async function sendMessageAction(formData: FormData) {
  const parsed = context.extend({ channelId: z.uuid(), body: z.string().trim().min(1).max(5000), replyToId: z.string().optional() }).parse(Object.fromEntries(formData.entries()));
  const { gym, supabase } = await clientFor(parsed.gymSlug);
  const reply = parsed.replyToId ? z.uuid().parse(parsed.replyToId) : undefined;
  const { error } = await supabase.rpc("send_chat_message", { target_gym_id: gym.id, target_channel_id: parsed.channelId, message_body: parsed.body, target_reply_id: reply });
  if (error) throw new Error(error.message);
  revalidatePath(`/g/${gym.slug}/app/chat/${parsed.channelId}`);
}

export async function editMessageAction(formData: FormData) {
  const parsed = context.extend({ channelId: z.uuid(), messageId: z.uuid(), body: z.string().trim().min(1).max(5000) }).parse(Object.fromEntries(formData.entries()));
  const { gym, supabase } = await clientFor(parsed.gymSlug);
  const { error } = await supabase.rpc("edit_chat_message", { target_gym_id: gym.id, target_message_id: parsed.messageId, message_body: parsed.body });
  if (error) throw new Error(error.message);
  revalidatePath(`/g/${gym.slug}/app/chat/${parsed.channelId}`);
}

export async function deleteMessageAction(formData: FormData) {
  const parsed = context.extend({ channelId: z.uuid(), messageId: z.uuid() }).parse(Object.fromEntries(formData.entries()));
  const { gym, supabase } = await clientFor(parsed.gymSlug);
  const { error } = await supabase.rpc("delete_chat_message", { target_gym_id: gym.id, target_message_id: parsed.messageId });
  if (error) throw new Error(error.message);
  revalidatePath(`/g/${gym.slug}/app/chat/${parsed.channelId}`);
}

export async function reportMessageAction(formData: FormData) {
  const parsed = context.extend({ channelId: z.uuid(), messageId: z.uuid(), reason: z.string().trim().min(3).max(1000) }).parse(Object.fromEntries(formData.entries()));
  const { gym, supabase } = await clientFor(parsed.gymSlug);
  const { error } = await supabase.rpc("report_chat_message", { target_gym_id: gym.id, target_message_id: parsed.messageId, report_reason: parsed.reason });
  if (error) throw new Error(error.message);
  revalidatePath(`/g/${gym.slug}/app/chat/${parsed.channelId}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRouteUser } from "@/lib/server/authorization";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

const contextSchema = z.object({ gymSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) });

export async function setNotificationReadAction(formData: FormData) {
  const parsed = contextSchema.extend({ notificationId: z.uuid(), read: z.enum(["true", "false"]) }).parse(Object.fromEntries(formData.entries()));
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.gymSlug });
  const supabase = await createServerComponentSupabaseClient();
  const user = await requireRouteUser(supabase);
  await supabase.from("notifications").update({ read_at: parsed.read === "true" ? new Date().toISOString() : null }).eq("id", parsed.notificationId).eq("gym_id", gym.id).eq("profile_id", user.id);
  revalidatePath(`/g/${gym.slug}/app/notifications`);
}

export async function markAllNotificationsReadAction(formData: FormData) {
  const parsed = contextSchema.parse(Object.fromEntries(formData.entries()));
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.gymSlug });
  const supabase = await createServerComponentSupabaseClient();
  const user = await requireRouteUser(supabase);
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("gym_id", gym.id).eq("profile_id", user.id).is("read_at", null);
  revalidatePath(`/g/${gym.slug}/app/notifications`);
}

export async function updateNotificationPreferencesAction(formData: FormData) {
  const parsed = contextSchema.extend({ quietStart: z.string(), quietEnd: z.string() }).parse(Object.fromEntries(formData.entries()));
  const quietStart = parsed.quietStart || null; const quietEnd = parsed.quietEnd || null;
  if ((quietStart === null) !== (quietEnd === null)) return;
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.gymSlug });
  const supabase = await createServerComponentSupabaseClient();
  const user = await requireRouteUser(supabase);
  await supabase.from("notification_preferences").upsert({ gym_id: gym.id, profile_id: user.id, announcements_enabled: formData.get("announcementsEnabled") === "on", events_enabled: formData.get("eventsEnabled") === "on", community_enabled: formData.get("communityEnabled") === "on", chat_enabled: formData.get("chatEnabled") === "on", email_enabled: formData.get("emailEnabled") === "on", push_enabled: formData.get("pushEnabled") === "on", quiet_hours_start: quietStart, quiet_hours_end: quietEnd }, { onConflict: "gym_id,profile_id" });
  revalidatePath(`/g/${gym.slug}/app/notifications`);
}

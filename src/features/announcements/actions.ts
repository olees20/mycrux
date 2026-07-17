"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { logger } from "@/lib/server/logger";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import { notificationDelivery } from "@/features/notifications/provider";
import type { AnnouncementActionState } from "./state";
import { zonedDateTimeToIso } from "./schedule";

const schema = z.object({
  gymSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  announcementId: z.union([z.uuid(), z.literal("")]).optional(),
  title: z.string().trim().min(1).max(160), body: z.string().trim().min(1).max(10_000),
  audience: z.enum(["public", "members", "staff"]), priority: z.enum(["normal", "important", "urgent"]),
  publication: z.enum(["draft", "published"]), publishAt: z.string().trim(), expiresAt: z.string().trim(), timezone: z.string().trim().min(1).max(80),
  isPinned: z.boolean(),
}).superRefine((value, context) => {
  if (value.publication === "published" && !value.publishAt) context.addIssue({ code: "custom", path: ["publishAt"], message: "Choose a publish time" });
});

function parse(formData: FormData) {
  return schema.safeParse({ ...Object.fromEntries(formData.entries()), isPinned: formData.get("isPinned") === "on" });
}

async function mutateAnnouncement(state: AnnouncementActionState, formData: FormData, update: boolean): Promise<AnnouncementActionState> {
  const parsed = parse(formData);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the announcement" };
  let publishAt: string | null; let expiresAt: string | null;
  try {
    publishAt = parsed.data.publishAt ? zonedDateTimeToIso(parsed.data.publishAt, parsed.data.timezone) : null;
    expiresAt = parsed.data.expiresAt ? zonedDateTimeToIso(parsed.data.expiresAt, parsed.data.timezone) : null;
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Enter a valid schedule" };
  }
  if (publishAt && expiresAt && Date.parse(expiresAt) <= Date.parse(publishAt)) return { status: "error", message: "Expiry must be after publication" };
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.data.gymSlug, allowedRoles: ["owner", "staff"] });
  const supabase = await createServerComponentSupabaseClient();
  const values = { title: parsed.data.title, body: parsed.data.body, audience: parsed.data.audience, priority: parsed.data.priority, status: parsed.data.publication, published_at: parsed.data.publication === "published" ? publishAt : null, expires_at: expiresAt, is_pinned: parsed.data.isPinned, archived_at: null };
  const result = update && parsed.data.announcementId ? await supabase.from("announcements").update(values).eq("id", parsed.data.announcementId).eq("gym_id", gym.id).select("id").single() : await supabase.from("announcements").insert({ ...values, gym_id: gym.id, author_id: (await supabase.auth.getUser()).data.user?.id ?? "" }).select("id").single();
  if (result.error) {
    logger.write({ level: "warn", event: "announcement_mutation_failed", context: { gymId: gym.id }, error: result.error });
    return { status: "error", message: "The announcement could not be saved. Check your permission and schedule." };
  }
  await notificationDelivery.external.enqueue({ gymId: gym.id, category: "announcement", sourceId: result.data.id });
  revalidatePath(`/g/${gym.slug}`);
  return { status: "success", message: update ? "Announcement updated." : "Announcement created." };
}

export async function createAnnouncementAction(state: AnnouncementActionState, formData: FormData) { return mutateAnnouncement(state, formData, false); }
export async function updateAnnouncementAction(state: AnnouncementActionState, formData: FormData) { return mutateAnnouncement(state, formData, true); }

export async function archiveAnnouncementAction(formData: FormData) {
  const parsed = z.object({ gymSlug: z.string(), announcementId: z.uuid() }).parse(Object.fromEntries(formData.entries()));
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.gymSlug, allowedRoles: ["owner", "staff"] });
  const supabase = await createServerComponentSupabaseClient();
  await supabase.from("announcements").update({ status: "archived", archived_at: new Date().toISOString() }).eq("id", parsed.announcementId).eq("gym_id", gym.id);
  revalidatePath(`/g/${gym.slug}`);
}

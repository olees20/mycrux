"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { zonedDateTimeToIso } from "@/features/announcements/schedule";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { discardMedia, uploadMedia } from "@/lib/server/media";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import type { Json, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import type { EventActionState } from "./state";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const schema = z.object({
  gymSlug: slug,
  eventId: z.union([z.uuid(), z.literal("")]),
  timezone: z.string().min(1).max(80),
  eventType: z.enum(["class", "workshop", "social", "competition", "youth", "other"]),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(10000),
  location: z.string().trim().max(240),
  organiserId: z.union([z.uuid(), z.literal("")]),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  capacity: z.union([z.coerce.number().int().positive(), z.literal("")]),
  registrationOpensAt: z.string(),
  registrationClosesAt: z.string(),
  cancellationClosesAt: z.string(),
  cancellationPolicy: z.string().trim().max(2000),
  status: z.enum(["draft", "published", "cancelled", "completed", "archived"]),
});

function refresh(gymSlug: string, eventId?: string) {
  revalidatePath(`/g/${gymSlug}/app/events`);
  revalidatePath(`/g/${gymSlug}/staff/events`);
  if (eventId) revalidatePath(`/g/${gymSlug}/app/events/${eventId}`);
}

export async function saveEventAction(_state: EventActionState, formData: FormData): Promise<EventActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the event" };
  let starts: string, ends: string, opens: string | null, closes: string | null, cancelCloses: string | null;
  try {
    starts = zonedDateTimeToIso(parsed.data.startsAt, parsed.data.timezone);
    ends = zonedDateTimeToIso(parsed.data.endsAt, parsed.data.timezone);
    opens = parsed.data.registrationOpensAt ? zonedDateTimeToIso(parsed.data.registrationOpensAt, parsed.data.timezone) : null;
    closes = parsed.data.registrationClosesAt ? zonedDateTimeToIso(parsed.data.registrationClosesAt, parsed.data.timezone) : null;
    cancelCloses = parsed.data.cancellationClosesAt ? zonedDateTimeToIso(parsed.data.cancellationClosesAt, parsed.data.timezone) : null;
  } catch {
    return { status: "error", message: "Enter valid event dates in the gym timezone." };
  }
  if (ends <= starts) return { status: "error", message: "Event end must be after its start." };
  if ([opens, closes, cancelCloses].some((deadline) => deadline && deadline > starts)) return { status: "error", message: "Booking deadlines cannot be after the event starts." };
  const roles = formData.getAll("eligibleRoles").map(String).filter((role) => ["member", "staff", "route_setter", "owner"].includes(role));
  if (!roles.length) return { status: "error", message: "Choose at least one eligible role." };
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.data.gymSlug, allowedRoles: ["owner", "staff"] });
  const supabase = await createServerComponentSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if(!user)return{status:"error",message:"Sign in again before saving the event."};
  let imagePath: string | undefined;
  let media:Awaited<ReturnType<typeof uploadMedia>>|null=null;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    try{media=await uploadMedia({client:supabase,file:image,purpose:"event",gymId:gym.id,ownerProfileId:user.id,targetId:parsed.data.eventId||null});imagePath=media.storagePath;}catch(error){return{status:"error",message:error instanceof Error?error.message:"Event image upload failed."};}
  }
  const values: TablesUpdate<"events"> = {
    event_type: parsed.data.eventType, title: parsed.data.title, description: parsed.data.description || null,
    location: parsed.data.location || null, organiser_id: parsed.data.organiserId || null, starts_at: starts, ends_at: ends,
    capacity: parsed.data.capacity === "" ? null : parsed.data.capacity, registration_opens_at: opens,
    registration_closes_at: closes, cancellation_closes_at: cancelCloses, cancellation_policy: parsed.data.cancellationPolicy || null,
    waitlist_enabled: formData.get("waitlistEnabled") === "on", eligibility: { roles } as Json, status: parsed.data.status,
    published_at: parsed.data.status === "published" ? new Date().toISOString() : null,
    archived_at: parsed.data.status === "archived" ? new Date().toISOString() : null, ...(imagePath ? { image_path: imagePath } : {}),
  };
  const result = parsed.data.eventId
    ? await supabase.from("events").update(values).eq("id", parsed.data.eventId).eq("gym_id", gym.id).select("id").single()
    : await supabase.from("events").insert({ ...values, gym_id: gym.id, created_by: user?.id ?? "", title: parsed.data.title, starts_at: starts, ends_at: ends } satisfies TablesInsert<"events">).select("id").single();
  if (result.error) {
    if (media) await discardMedia(supabase,media);
    return { status: "error", message: "The event could not be saved. Check dates, permission and booking windows." };
  }
  refresh(gym.slug, result.data.id);
  return { status: "success", message: parsed.data.eventId ? "Event updated." : "Event created." };
}

export async function registerEventAction(_state: EventActionState, formData: FormData): Promise<EventActionState> {
  const parsed = z.object({ gymSlug: slug, eventId: z.uuid() }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: "Event is invalid." };
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.data.gymSlug });
  const supabase = await createServerComponentSupabaseClient();
  const { data, error } = await supabase.rpc("register_for_event", { target_gym_id: gym.id, target_event_id: parsed.data.eventId });
  if (error) return { status: "error", message: error.message };
  refresh(gym.slug, parsed.data.eventId);
  return { status: "success", message: data === "registered" ? "Booking confirmed." : "Event is full—you joined the waitlist." };
}

export async function cancelEventAction(_state: EventActionState, formData: FormData): Promise<EventActionState> {
  const parsed = z.object({ gymSlug: slug, eventId: z.uuid() }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: "Event is invalid." };
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.data.gymSlug });
  const supabase = await createServerComponentSupabaseClient();
  const { error } = await supabase.rpc("cancel_event_registration", { target_gym_id: gym.id, target_event_id: parsed.data.eventId });
  if (error) return { status: "error", message: error.message };
  refresh(gym.slug, parsed.data.eventId);
  return { status: "success", message: "Registration cancelled." };
}

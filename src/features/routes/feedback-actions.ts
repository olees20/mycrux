"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import type { RouteActionState } from "./state";

const base = z.object({ gymSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), routeId: z.uuid() });
const feedback = base.extend({ kind: z.enum(["loved_it","grade_soft","grade_right","grade_hard","spinning_hold","dirty_hold","other_issue"]), comment: z.string().trim().max(1000).optional() }).superRefine((value, context) => { if (value.kind === "other_issue" && !value.comment) context.addIssue({ code: "custom", path: ["comment"], message: "Describe the issue" }); });

export async function submitRouteFeedbackAction(_state: RouteActionState, formData: FormData): Promise<RouteActionState> {
  const parsed = feedback.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the feedback" };
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.data.gymSlug }); const supabase = await createServerComponentSupabaseClient();
  const { error } = await supabase.rpc("submit_route_feedback", { target_gym_id: gym.id, target_route_id: parsed.data.routeId, target_kind: parsed.data.kind, feedback_comment: parsed.data.comment || null });
  if (error) return { status: "error", message: error.code === "23505" ? "You already sent that feedback for this route." : error.message.includes("Too many requests") ? error.message : "Feedback could not be submitted." };
  revalidatePath(`/g/${gym.slug}/app/routes/${parsed.data.routeId}`); return { status: "success", message: "Thanks—your private feedback was sent to the gym team." };
}

export async function toggleRouteFavouriteAction(_state: RouteActionState, formData: FormData): Promise<RouteActionState> {
  const parsed = base.safeParse(Object.fromEntries(formData.entries())); if (!parsed.success) return { status: "error", message: "The route is invalid." };
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.data.gymSlug }); const supabase = await createServerComponentSupabaseClient();
  const { data, error } = await supabase.rpc("toggle_route_favourite", { target_gym_id: gym.id, target_route_id: parsed.data.routeId });
  if (error) return { status: "error", message: error.message.includes("Too many requests") ? error.message : "Favourite could not be updated." };
  revalidatePath(`/g/${gym.slug}/app/routes/${parsed.data.routeId}`); return { status: "success", message: data ? "Added to favourites." : "Removed from favourites." };
}

export async function triageRouteFeedbackAction(formData: FormData) {
  const parsed = z.object({ gymSlug: z.string(), feedbackId: z.uuid(), status: z.enum(["open","reviewing","resolved","dismissed"]) }).parse(Object.fromEntries(formData.entries()));
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.gymSlug, allowedRoles: ["owner","staff","route_setter"] }); const supabase = await createServerComponentSupabaseClient();
  await supabase.rpc("triage_route_feedback", { target_feedback_id: parsed.feedbackId, target_status: parsed.status }); revalidatePath(`/g/${gym.slug}/staff/route-feedback`);
}

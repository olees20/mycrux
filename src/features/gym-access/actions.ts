"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { logger } from "@/lib/server/logger";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import { gymJoinErrorMessage, normalizeGymCode } from "./core";
import type { GymJoinActionState, MemberAccessActionState } from "./state";

const referenceSchema = z.object({
  reference: z.string().trim().min(1).max(128),
  kind: z.enum(["qr", "code"]),
});
const gymSlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export async function joinGymAction(
  _state: GymJoinActionState,
  formData: FormData,
): Promise<GymJoinActionState> {
  const parsed = referenceSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: "The gym access reference is invalid." };
  const reference = parsed.data.kind === "code" ? normalizeGymCode(parsed.data.reference) : parsed.data.reference;
  const supabase = await createServerComponentSupabaseClient();
  const { data: membershipId, error } = await supabase.rpc("join_gym_as_member", {
    join_reference: reference,
    reference_kind: parsed.data.kind,
  });
  if (error || !membershipId) {
    logger.write({ level: "warn", event: "gym_member_join_failed", context: { method: parsed.data.kind }, error });
    return { status: "error", message: gymJoinErrorMessage(error ?? {}) };
  }
  const { data: membership } = await supabase.from("gym_memberships").select("gym_id").eq("id", membershipId).single();
  const { data: gym } = membership
    ? await supabase.from("gyms").select("slug").eq("id", membership.gym_id).single()
    : { data: null };
  redirect(gym ? `/g/${gym.slug}/app` : "/app");
}

export async function rotateGymJoinCredentialsAction(
  _state: MemberAccessActionState,
  formData: FormData,
): Promise<MemberAccessActionState> {
  const parsed = gymSlugSchema.safeParse(formData.get("gymSlug"));
  if (!parsed.success) return { status: "error", message: "The gym context is invalid." };
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.data, allowedRoles: ["owner", "staff"] });
  const supabase = await createServerComponentSupabaseClient();
  const { error } = await supabase.rpc("rotate_gym_join_credentials", { target_gym_id: gym.id });
  if (error) return { status: "error", message: "Member access could not be rotated. Check your permission and try again." };
  revalidatePath(`/g/${gym.slug}/staff/member-access`);
  return { status: "success", message: "Member access rotated. The previous QR and gym code no longer work." };
}

export async function setGymJoinEnabledAction(
  _state: MemberAccessActionState,
  formData: FormData,
): Promise<MemberAccessActionState> {
  const parsed = z.object({ gymSlug: gymSlugSchema, enabled: z.enum(["true", "false"]) }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: "The member access setting is invalid." };
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.data.gymSlug, allowedRoles: ["owner", "staff"] });
  const supabase = await createServerComponentSupabaseClient();
  const enabled = parsed.data.enabled === "true";
  const { error } = await supabase.rpc("set_gym_join_enabled", { target_gym_id: gym.id, access_enabled: enabled });
  if (error) return { status: "error", message: "Member access could not be updated. Check your permission and try again." };
  revalidatePath(`/g/${gym.slug}/staff/member-access`);
  return { status: "success", message: enabled ? "QR and gym-code joining enabled." : "QR and gym-code joining disabled." };
}

"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPublicEnvironment } from "@/env/client";
import { staffRoleKeys } from "@/lib/permissions";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { logger } from "@/lib/server/logger";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import type { StaffActionState } from "./state";

const gymSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const staffRole = z.enum(staffRoleKeys);
const uuid = z.uuid();
const inviteSchema = z.object({ gymSlug, email: z.email().trim().toLowerCase().max(320), role: staffRole });
const invitationSchema = z.object({ gymSlug, invitationId: uuid });
const accessSchema = z.object({
  gymSlug,
  membershipId: uuid,
  role: staffRole,
  status: z.enum(["active", "suspended", "left"]),
});

function values(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function newInvitationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: createHash("sha256").update(token).digest("hex") };
}

function invitationLink(token: string) {
  const siteUrl = getPublicEnvironment().NEXT_PUBLIC_SITE_URL;
  return `${siteUrl}/onboarding?token=${encodeURIComponent(token)}`;
}

async function staffContext(slug: string) {
  const context = await requireActiveGymContext({
    gymSlug: slug,
    allowedRoles: ["owner", "staff", "route_setter"],
  });
  return { ...context, supabase: await createServerComponentSupabaseClient() };
}

export async function inviteStaffAction(
  _state: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const parsed = inviteSchema.safeParse(values(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the invitation details" };

  const { gym, supabase } = await staffContext(parsed.data.gymSlug);
  const invitation = newInvitationToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000).toISOString();
  const { error } = await supabase.rpc("create_staff_invitation", {
    target_gym_id: gym.id,
    invite_email: parsed.data.email,
    target_role_key: parsed.data.role,
    invitation_token_hash: invitation.hash,
    invitation_expires_at: expiresAt,
  });

  if (error) {
    logger.write({ level: "warn", event: "staff_invitation_create_failed", context: { gymId: gym.id, role: parsed.data.role }, error });
    return { status: "error", message: error.code === "23505" ? "A pending invitation already exists for that email." : "The invitation could not be created. Check your permission and try again." };
  }

  revalidatePath(`/g/${gym.slug}/staff/team`);
  return { status: "success", message: "Invitation created. Copy this link now; the token is not stored in plain text.", invitationUrl: invitationLink(invitation.token) };
}

export async function resendStaffInvitationAction(
  _state: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const parsed = invitationSchema.safeParse(values(formData));
  if (!parsed.success) return { status: "error", message: "The invitation is invalid." };

  const { gym, supabase } = await staffContext(parsed.data.gymSlug);
  const invitation = newInvitationToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000).toISOString();
  const { error } = await supabase.rpc("resend_staff_invitation", {
    target_invitation_id: parsed.data.invitationId,
    invitation_token_hash: invitation.hash,
    invitation_expires_at: expiresAt,
  });

  if (error) {
    logger.write({ level: "warn", event: "staff_invitation_resend_failed", context: { gymId: gym.id }, error });
    return { status: "error", message: "The invitation could not be resent." };
  }

  revalidatePath(`/g/${gym.slug}/staff/team`);
  return { status: "success", message: "A fresh single-use link was created. The previous link no longer works.", invitationUrl: invitationLink(invitation.token) };
}

export async function revokeStaffInvitationAction(
  _state: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const parsed = invitationSchema.safeParse(values(formData));
  if (!parsed.success) return { status: "error", message: "The invitation is invalid." };

  const { gym, supabase } = await staffContext(parsed.data.gymSlug);
  const { error } = await supabase.rpc("revoke_staff_invitation", {
    target_invitation_id: parsed.data.invitationId,
  });
  if (error) {
    logger.write({ level: "warn", event: "staff_invitation_revoke_failed", context: { gymId: gym.id }, error });
    return { status: "error", message: "The invitation could not be revoked." };
  }
  revalidatePath(`/g/${gym.slug}/staff/team`);
  return { status: "success", message: "Invitation revoked." };
}

export async function updateStaffAccessAction(
  _state: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const parsed = accessSchema.safeParse(values(formData));
  if (!parsed.success) return { status: "error", message: "Check the staff role and status." };

  const { gym, supabase } = await staffContext(parsed.data.gymSlug);
  const { error } = await supabase.rpc("update_staff_access", {
    target_membership_id: parsed.data.membershipId,
    target_role_key: parsed.data.role,
    target_status: parsed.data.status,
  });
  if (error) {
    logger.write({ level: "warn", event: "staff_access_update_failed", context: { gymId: gym.id }, error });
    return { status: "error", message: "Access could not be updated. You may not manage that role." };
  }
  revalidatePath(`/g/${gym.slug}/staff/team`);
  return { status: "success", message: "Staff access updated." };
}

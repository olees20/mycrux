"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPublicEnvironment } from "@/env/client";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { requireRouteUser } from "@/lib/server/authorization";
import { logger } from "@/lib/server/logger";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import type { AuthActionState } from "./state";

const email = z.string().trim().toLowerCase().email().max(320);
const password = z.string().min(12, "Use at least 12 characters").max(128);
const loginSchema = z.object({ email, password: z.string().min(1), next: z.string().optional() });
const registerSchema = z.object({
  email,
  password,
  displayName: z.string().trim().min(1).max(80),
});
const forgotSchema = z.object({ email });
const resetSchema = z.object({ password });
const invitationSchema = z.object({ token: z.string().trim().min(16).max(512) });
const membershipRequestSchema = z.object({ gymId: z.uuid() });

function formValues(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function validationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Please check the submitted details";
}

export async function loginAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(formValues(formData));
  if (!parsed.success) return { status: "error", message: validationMessage(parsed.error) };

  const supabase = await createServerComponentSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { status: "error", message: "Email or password is incorrect" };
  }
  if (!data.user.email_confirmed_at) redirect("/verify-email");

  redirect(safeRedirectPath(parsed.data.next));
}

export async function registerAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse(formValues(formData));
  if (!parsed.success) return { status: "error", message: validationMessage(parsed.error) };

  const supabase = await createServerComponentSupabaseClient();
  const environment = getPublicEnvironment();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${environment.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    logger.write({ level: "warn", event: "registration_failed", error });
    return { status: "error", message: "We could not create that account. Check the details and try again." };
  }

  redirect("/verify-email");
}

export async function forgotPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotSchema.safeParse(formValues(formData));
  if (!parsed.success) return { status: "error", message: validationMessage(parsed.error) };

  const supabase = await createServerComponentSupabaseClient();
  const environment = getPublicEnvironment();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${environment.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  });

  if (error) logger.write({ level: "warn", event: "password_reset_request_failed", error });
  return {
    status: "success",
    message: "If an account exists for that email, a reset link is on its way.",
  };
}

export async function resetPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetSchema.safeParse(formValues(formData));
  if (!parsed.success) return { status: "error", message: validationMessage(parsed.error) };

  const supabase = await createServerComponentSupabaseClient();
  const user = await requireRouteUser(supabase);
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    logger.write({ level: "warn", event: "password_update_failed", context: { profileId: user.id }, error });
    return { status: "error", message: "The password could not be updated. Request a new reset link." };
  }

  await supabase.auth.signOut();
  redirect("/login?reset=success");
}

export async function logoutAction() {
  const supabase = await createServerComponentSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function acceptInvitationAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = invitationSchema.safeParse(formValues(formData));
  if (!parsed.success) return { status: "error", message: validationMessage(parsed.error) };

  const supabase = await createServerComponentSupabaseClient();
  await requireRouteUser(supabase);
  const invitationTokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const { error } = await supabase.rpc("accept_gym_invitation", {
    invitation_token_hash: invitationTokenHash,
  });

  if (error) {
    logger.write({ level: "warn", event: "invitation_acceptance_failed", error });
    return { status: "error", message: "This invitation is invalid, expired, or belongs to another account." };
  }

  redirect("/app");
}

export async function requestMembershipAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = membershipRequestSchema.safeParse(formValues(formData));
  if (!parsed.success) return { status: "error", message: validationMessage(parsed.error) };

  const supabase = await createServerComponentSupabaseClient();
  const user = await requireRouteUser(supabase);
  const { error } = await supabase.from("gym_memberships").insert({
    gym_id: parsed.data.gymId,
    profile_id: user.id,
    role: "member",
    status: "invited",
  });

  if (error?.code === "23505") {
    return { status: "success", message: "Your request is already with this gym." };
  }
  if (error) {
    logger.write({ level: "warn", event: "membership_request_failed", context: { gymId: parsed.data.gymId }, error });
    return { status: "error", message: "The request could not be sent. Check the gym and try again." };
  }

  return { status: "success", message: "Request sent. The gym will review your membership." };
}

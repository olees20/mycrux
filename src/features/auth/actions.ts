"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getPublicEnvironment } from "@/env/client";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { consumeAuthRateLimit } from "@/lib/server/auth-rate-limit";
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
  next: z.string().optional(),
});
const forgotSchema = z.object({ email });
const resetSchema = z.object({ password });

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
  const rateLimit = await consumeAuthRateLimit("login", parsed.data.email);
  if (!rateLimit.allowed) return { status: "error", message: "Email or password is incorrect" };

  const supabase = await createServerComponentSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { status: "error", message: "Email or password is incorrect" };
  }

  redirect(safeRedirectPath(parsed.data.next));
}

function registrationErrorMessage(error: Readonly<{ code?: string; message?: string }>) {
  const description = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  if (description.includes("password") && (description.includes("weak") || description.includes("invalid"))) {
    return "Choose a stronger password with at least 12 characters.";
  }
  if (description.includes("already") || description.includes("exists") || description.includes("registered")) {
    return "An account may already use that email. Try signing in or reset your password.";
  }
  return "We could not create that account. Check the details and try again.";
}

export async function registerAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse(formValues(formData));
  if (!parsed.success) return { status: "error", message: validationMessage(parsed.error) };
  const rateLimit = await consumeAuthRateLimit("register", parsed.data.email);
  if (!rateLimit.allowed) {
    return { status: "error", message: "We could not create that account. Check the details and try again." };
  }

  const supabase = await createServerComponentSupabaseClient();
  const next = safeRedirectPath(parsed.data.next, "/onboarding");
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
    },
  });

  if (error) {
    logger.write({ level: "warn", event: "registration_failed", error });
    return { status: "error", message: registrationErrorMessage(error) };
  }
  if (!data.user || !data.session) {
    logger.write({ level: "warn", event: "registration_session_missing" });
    return {
      status: "error",
      message: "Your account could not be signed in automatically. Try signing in or contact support.",
    };
  }

  redirect(next);
}

export async function forgotPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotSchema.safeParse(formValues(formData));
  if (!parsed.success) return { status: "error", message: validationMessage(parsed.error) };
  const rateLimit = await consumeAuthRateLimit("forgotPassword", parsed.data.email);
  if (!rateLimit.allowed) {
    return { status: "success", message: "If an account exists for that email, a reset link is on its way." };
  }

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

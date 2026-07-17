"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { gymBrandingSchema, gymDetailsSchema, hasValidLogoSignature, logoFileSchema } from "./validation";
import type { GymActionState } from "./state";
import { ACTIVE_GYM_COOKIE, requireActiveGymContext } from "@/lib/server/gym-context";
import { gymPath, gymSlugSchema } from "@/lib/server/gym-context-core";
import { logger } from "@/lib/server/logger";
import { requireRouteUser } from "@/lib/server/authorization";
import { privilegedAccess } from "@/lib/supabase/admin";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const switchGymSchema = z.object({ gymSlug: gymSlugSchema, destination: z.enum(["/app", "/staff"]).default("/app") });

export async function switchGymAction(formData: FormData): Promise<never> {
  const parsed = switchGymSchema.parse({ gymSlug: formData.get("gymSlug"), destination: formData.get("destination") ?? "/app" });
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.gymSlug, allowedRoles: parsed.destination === "/staff" ? ["owner", "staff", "route_setter"] : undefined });
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_GYM_COOKIE, gym.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect(gymPath(gym, parsed.destination));
}

function parseForms(formData: FormData) {
  const details = gymDetailsSchema.safeParse({
    name: formData.get("name"), slug: formData.get("slug"), addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2") ?? undefined, city: formData.get("city"), postcode: formData.get("postcode"),
    countryCode: formData.get("countryCode"), timezone: formData.get("timezone"), contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone") ?? undefined, disciplines: formData.getAll("disciplines"),
    openingHoursText: formData.get("openingHoursText"), publicJoinRequestsEnabled: formData.get("publicJoinRequestsEnabled") === "on",
  });
  const branding = gymBrandingSchema.safeParse({
    primaryColour: formData.get("primaryColour"), accentColour: formData.get("accentColour"),
    backgroundColour: formData.get("backgroundColour"), welcomeMessage: formData.get("welcomeMessage") ?? undefined,
  });
  if (!details.success || !branding.success) {
    return { error: details.error?.issues[0]?.message ?? branding.error?.issues[0]?.message ?? "Check the gym details" } as const;
  }
  return { details: details.data, branding: branding.data } as const;
}

export async function createGymAction(_state: GymActionState, formData: FormData): Promise<GymActionState> {
  const parsed = parseForms(formData);
  if ("error" in parsed) return { status: "error", message: parsed.error };
  const supabase = await createServerComponentSupabaseClient();
  const user = await requireRouteUser(supabase);
  const { data: profile } = await supabase.from("profiles").select("is_platform_admin").eq("id", user.id).single();
  if (!profile?.is_platform_admin) return { status: "error", message: "Platform authorisation is required to create a gym." };
  try {
    await privilegedAccess.createGymTenant({ actorProfileId: user.id, ownerProfileId: user.id, details: parsed.details, branding: parsed.branding });
  } catch (error) {
    logger.write({ level: "warn", event: "gym_creation_action_failed", context: { profileId: user.id }, error });
    return { status: "error", message: "The gym could not be created. The slug may already be in use." };
  }
  redirect(`/g/${parsed.details.slug}/staff/settings`);
}

export async function updateGymAction(_state: GymActionState, formData: FormData): Promise<GymActionState> {
  const parsed = parseForms(formData);
  const currentSlug = String(formData.get("currentSlug") ?? "");
  if ("error" in parsed) return { status: "error", message: parsed.error };
  const { gym } = await requireActiveGymContext({ gymSlug: currentSlug, allowedRoles: ["owner"] });
  const supabase = await createServerComponentSupabaseClient();
  const { error } = await supabase.rpc("update_gym_configuration", {
    target_gym_id: gym.id, gym_name: parsed.details.name, gym_slug: parsed.details.slug,
    gym_timezone: parsed.details.timezone, gym_country_code: parsed.details.countryCode,
    gym_address_line_1: parsed.details.addressLine1, gym_address_line_2: parsed.details.addressLine2 ?? "",
    gym_city: parsed.details.city, gym_postcode: parsed.details.postcode, gym_contact_email: parsed.details.contactEmail,
    gym_contact_phone: parsed.details.contactPhone ?? "", gym_disciplines: parsed.details.disciplines,
    gym_opening_hours_text: parsed.details.openingHoursText, allow_public_join_requests: parsed.details.publicJoinRequestsEnabled,
    brand_primary_colour: parsed.branding.primaryColour, brand_accent_colour: parsed.branding.accentColour,
    brand_background_colour: parsed.branding.backgroundColour, brand_welcome_message: parsed.branding.welcomeMessage ?? "",
  });
  if (error) {
    logger.write({ level: "warn", event: "gym_configuration_update_failed", context: { gymId: gym.id }, error });
    return { status: "error", message: "Settings could not be saved. Check the slug and colour contrast." };
  }
  revalidatePath(`/g/${parsed.details.slug}`, "layout");
  if (parsed.details.slug !== currentSlug) redirect(`/g/${parsed.details.slug}/staff/settings`);
  return { status: "success", message: "Gym settings saved." };
}

export async function uploadGymLogoAction(_state: GymActionState, formData: FormData): Promise<GymActionState> {
  const gymSlug = String(formData.get("gymSlug") ?? "");
  const parsedFile = logoFileSchema.safeParse(formData.get("logo"));
  if (!parsedFile.success) return { status: "error", message: parsedFile.error.issues[0]?.message ?? "Choose a valid logo" };
  if (!await hasValidLogoSignature(parsedFile.data)) return { status: "error", message: "The file contents do not match the selected image type." };
  const { gym } = await requireActiveGymContext({ gymSlug, allowedRoles: ["owner"] });
  const supabase = await createServerComponentSupabaseClient();
  const extension = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[parsedFile.data.type];
  if (!extension) return { status: "error", message: "Unsupported logo type." };
  const objectPath = `${gym.id}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("gym-branding").upload(objectPath, parsedFile.data, { contentType: parsedFile.data.type, upsert: false });
  if (uploadError) return { status: "error", message: "The logo upload failed." };
  const { error } = await supabase.rpc("set_gym_logo_path", { target_gym_id: gym.id, object_path: objectPath });
  if (error) {
    await supabase.storage.from("gym-branding").remove([objectPath]);
    return { status: "error", message: "The uploaded logo could not be attached to the gym." };
  }
  revalidatePath(`/g/${gym.slug}`, "layout");
  return { status: "success", message: "Logo updated." };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { logger } from "@/lib/server/logger";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import type { GymSetupActionState } from "./setup-state";
import { setupClimbingSchema, setupDetailsSchema, setupLocationSchema, setupMembersSchema } from "./setup-validation";

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

function errors(error: z.ZodError): GymSetupActionState {
  const fields = Object.fromEntries(error.issues.flatMap((issue) => {
    const field = issue.path[0];
    return typeof field === "string" ? [[field, issue.message]] : [];
  }));
  return {
    status: "error",
    message: "Check the highlighted fields and try again.",
    fieldErrors: fields,
  };
}

async function save(gymSlug: string, step: number, configuration: Json): Promise<GymSetupActionState | null> {
  const { gym } = await requireActiveGymContext({ gymSlug, allowedRoles: ["owner"] });
  const supabase = await createServerComponentSupabaseClient();
  const { error } = await supabase.rpc("save_gym_setup_step", { target_gym_id: gym.id, target_step: step, configuration });
  if (error) {
    logger.write({ level: "warn", event: "gym_setup_step_failed", context: { gymId: gym.id, step, code: error.code }, error });
    const message = error.code === "23514" ? error.message : error.code === "42501" ? "This change needs gym owner access and an eligible plan. Check your plan if you changed custom branding." : "This step could not be saved. Your current values remain on screen.";
    return { status: "error", message };
  }
  revalidatePath(`/g/${gym.slug}/staff`, "layout");
  return null;
}

function slug(formData: FormData) { return slugSchema.safeParse(formData.get("gymSlug")); }

export async function saveSetupDetailsAction(_state: GymSetupActionState, formData: FormData): Promise<GymSetupActionState> {
  const gymSlug = slug(formData);
  const parsed = setupDetailsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!gymSlug.success || !parsed.success) return parsed.success ? { status: "error", message: "The gym address is invalid." } : errors(parsed.error);
  const result = await save(gymSlug.data, 1, parsed.data as Json);
  if (result) return result;
  redirect(`/g/${gymSlug.data}/staff/setup?step=2`);
}

export async function saveSetupLocationAction(_state: GymSetupActionState, formData: FormData): Promise<GymSetupActionState> {
  const gymSlug = slug(formData);
  const parsed = setupLocationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!gymSlug.success || !parsed.success) return parsed.success ? { status: "error", message: "The gym address is invalid." } : errors(parsed.error);
  const result = await save(gymSlug.data, 2, parsed.data as Json);
  if (result) return result;
  redirect(`/g/${gymSlug.data}/staff/setup?step=3`);
}

export async function saveSetupClimbingAction(_state: GymSetupActionState, formData: FormData): Promise<GymSetupActionState> {
  const gymSlug = slug(formData);
  const parsed = setupClimbingSchema.safeParse({
    disciplines: formData.getAll("disciplines"), gradeSystems: formData.get("gradeSystems"),
    defaultRouteType: formData.get("defaultRouteType"), defaultGrade: formData.get("defaultGrade"),
  });
  if (!gymSlug.success || !parsed.success) return parsed.success ? { status: "error", message: "The gym address is invalid." } : errors(parsed.error);
  const result = await save(gymSlug.data, 3, parsed.data as Json);
  if (result) return result;
  redirect(`/g/${gymSlug.data}/staff/setup?step=4`);
}

export async function continueSetupAction(_state: GymSetupActionState, formData: FormData): Promise<GymSetupActionState> {
  const gymSlug = slug(formData);
  const parsedStep = z.coerce.number().int().min(4).max(6).safeParse(formData.get("step"));
  if (!gymSlug.success || !parsedStep.success) return { status: "error", message: "The setup request is invalid." };
  let configuration: Json = {};
  if (parsedStep.data === 5) {
    const parsed = setupMembersSchema.parse({ publicJoinRequestsEnabled: formData.get("publicJoinRequestsEnabled") === "on" });
    configuration = parsed as Json;
  }
  const result = await save(gymSlug.data, parsedStep.data, configuration);
  if (result) return result;
  redirect(parsedStep.data === 6 ? `/g/${gymSlug.data}/staff?setup=complete` : `/g/${gymSlug.data}/staff/setup?step=${parsedStep.data + 1}`);
}

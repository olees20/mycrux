"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { staffRoleKeys } from "@/lib/permissions";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { logger } from "@/lib/server/logger";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import type { StaffActionState } from "./state";

const gymSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const staffRole = z.enum(staffRoleKeys);
const uuid = z.uuid();
const accessSchema = z.object({
  gymSlug,
  membershipId: uuid,
  role: staffRole,
  status: z.enum(["active", "suspended", "left"]),
});

function values(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function staffContext(slug: string) {
  const context = await requireActiveGymContext({
    gymSlug: slug,
    allowedRoles: ["owner", "staff", "route_setter"],
  });
  return { ...context, supabase: await createServerComponentSupabaseClient() };
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

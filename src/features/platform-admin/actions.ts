"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/server/platform-admin";
import { privilegedAccess } from "@/lib/supabase/admin";

const operationSchema=z.object({gymId:z.uuid(),reason:z.string().trim().min(3).max(500)});
const noteSchema=z.object({gymId:z.uuid(),note:z.string().trim().min(3).max(2000)});

export async function addSupportNoteAction(formData:FormData){const input=noteSchema.parse({gymId:formData.get("gymId"),note:formData.get("note")}),user=await requirePlatformAdmin();await privilegedAccess.addPlatformSupportNote(user.id,input.gymId,input.note);revalidatePath(`/platform/gyms/${input.gymId}`);redirect(`/platform/gyms/${input.gymId}?notice=note-added`);}
export async function suspendGymAction(formData:FormData){const input=operationSchema.parse({gymId:formData.get("gymId"),reason:formData.get("reason")}),user=await requirePlatformAdmin();await privilegedAccess.suspendPlatformGym(user.id,input.gymId,input.reason);revalidatePath("/platform");redirect(`/platform/gyms/${input.gymId}?notice=suspended`);}
export async function restoreGymAction(formData:FormData){const input=operationSchema.parse({gymId:formData.get("gymId"),reason:formData.get("reason")}),user=await requirePlatformAdmin();await privilegedAccess.restorePlatformGym(user.id,input.gymId,input.reason);revalidatePath("/platform");redirect(`/platform/gyms/${input.gymId}?notice=restored`);}

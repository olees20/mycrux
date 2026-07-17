"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveGymContext, ACTIVE_GYM_COOKIE } from "@/lib/server/gym-context";
import { gymPath, gymSlugSchema } from "@/lib/server/gym-context-core";

const switchGymSchema = z.object({
  gymSlug: gymSlugSchema,
  destination: z.enum(["/app", "/staff"]).default("/app"),
});

export async function switchGymAction(formData: FormData): Promise<never> {
  const parsed = switchGymSchema.parse({
    gymSlug: formData.get("gymSlug"),
    destination: formData.get("destination") ?? "/app",
  });
  const { gym } = await requireActiveGymContext({
    gymSlug: parsed.gymSlug,
    allowedRoles: parsed.destination === "/staff" ? ["owner", "staff", "route_setter"] : undefined,
  });
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_GYM_COOKIE, gym.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(gymPath(gym, parsed.destination));
}

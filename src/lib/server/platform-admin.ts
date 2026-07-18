import "server-only";

import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server/authorization";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export async function requirePlatformAdmin() {
  const supabase = await createServerComponentSupabaseClient();
  const user = await requireUser({ redirectTo: "/platform", client: supabase });
  const { data: profile } = await supabase.from("profiles").select("is_platform_admin,suspended_at,deleted_at").eq("id", user.id).single();
  if (!profile?.is_platform_admin || profile.suspended_at || profile.deleted_at) notFound();
  return user;
}

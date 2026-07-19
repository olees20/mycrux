import { NextResponse } from "next/server";
import { gymSlugInput } from "@/features/gyms/validation";
import { correlationIdFromRequest } from "@/lib/server/request-context";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/route-handler";

function response(body: Record<string, unknown>, correlationId: string, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store", "x-request-id": correlationId },
  });
}

export async function GET(request: Request) {
  const correlationId = correlationIdFromRequest(request);
  const supabase = await createRouteHandlerSupabaseClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) return response({ error: "Authentication is required" }, correlationId, 401);
  if (!data.user.email_confirmed_at) return response({ error: "A verified email is required" }, correlationId, 403);

  const candidate = new URL(request.url).searchParams.get("slug") ?? "";
  const parsed = gymSlugInput.safeParse(candidate);
  if (!parsed.success) {
    return response({ available: false, valid: false, message: parsed.error.issues[0]?.message ?? "Use a valid gym address" }, correlationId);
  }

  const { data: available, error } = await supabase.rpc("is_gym_slug_available", { requested_slug: parsed.data });
  if (error) return response({ error: "Availability could not be checked" }, correlationId, 503);
  return response({ available: Boolean(available), valid: true }, correlationId);
}

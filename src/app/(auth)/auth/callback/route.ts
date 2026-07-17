import { NextResponse } from "next/server";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { logger } from "@/lib/server/logger";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/route-handler";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"), "/onboarding");

  if (!code) {
    return NextResponse.redirect(new URL("/login?authError=missing_code", requestUrl.origin));
  }

  const supabase = await createRouteHandlerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    logger.write({ level: "warn", event: "auth_callback_exchange_failed", error });
    return NextResponse.redirect(new URL("/login?authError=invalid_callback", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

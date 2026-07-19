import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnvironment } from "@/env/client";
import { isAuthenticationProtectedPath, isGymMembershipProtectedPath, shouldRedirectToOnboarding } from "@/lib/auth/onboarding-redirect";
import type { Database } from "@/lib/supabase/database.types";

function redirectWithCookies(request: NextRequest, response: NextResponse, path: string, correlationId: string) {
  const redirectResponse = NextResponse.redirect(new URL(path, request.url));
  redirectResponse.headers.set("x-request-id", correlationId);
  for (const cookie of response.cookies.getAll()) redirectResponse.cookies.set(cookie);
  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  const suppliedRequestId = request.headers.get("x-request-id")?.trim();
  const correlationId = suppliedRequestId && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(suppliedRequestId) ? suppliedRequestId : randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", correlationId);
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", correlationId);
  const environment = getPublicEnvironment();
  const supabase = createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request: { headers: requestHeaders } });
          response.headers.set("x-request-id", correlationId);
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const pathname = request.nextUrl.pathname;
  const protectedPage = isGymMembershipProtectedPath(pathname);

  if (isAuthenticationProtectedPath(pathname) && !user) {
    const next = encodeURIComponent(`${pathname}${request.nextUrl.search}`);
    return redirectWithCookies(request, response, `/login?next=${next}`, correlationId);
  }

  if (user && protectedPage) {
    const { data: memberships, error: membershipError } = await supabase
      .from("gym_memberships")
      .select("role")
      .eq("profile_id", user.id)
      .eq("status", "active")
      .limit(10);

    if (shouldRedirectToOnboarding({
      activeMembershipCount: memberships?.length ?? 0,
      lookupFailed: Boolean(membershipError),
      pathname,
    })) return redirectWithCookies(request, response, "/onboarding", correlationId);
    if (
      (pathname.startsWith("/staff") || /^\/g\/[^/]+\/staff(?:\/|$)/.test(pathname))
      && !membershipError
      && memberships
      && !memberships.some(({ role }) => ["owner", "staff", "route_setter"].includes(role))
    ) {
      return redirectWithCookies(request, response, "/app", correlationId);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

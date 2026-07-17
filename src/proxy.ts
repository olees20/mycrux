import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnvironment } from "@/env/client";
import type { Database } from "@/lib/supabase/database.types";

function redirectWithCookies(request: NextRequest, response: NextResponse, path: string) {
  const redirectResponse = NextResponse.redirect(new URL(path, request.url));
  for (const cookie of response.cookies.getAll()) redirectResponse.cookies.set(cookie);
  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const environment = getPublicEnvironment();
  const supabase = createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const pathname = request.nextUrl.pathname;
  const protectedPage = pathname.startsWith("/app") || pathname.startsWith("/staff") || pathname.startsWith("/g/");
  const onboarding = pathname.startsWith("/onboarding");
  const resetPassword = pathname.startsWith("/reset-password");
  const platformPage = pathname.startsWith("/platform/");

  if ((protectedPage || onboarding || resetPassword || platformPage) && !user) {
    const next = encodeURIComponent(`${pathname}${request.nextUrl.search}`);
    return redirectWithCookies(request, response, `/login?next=${next}`);
  }

  if (user && !user.email_confirmed_at && (protectedPage || onboarding || platformPage)) {
    return redirectWithCookies(request, response, "/verify-email");
  }

  if (user && protectedPage) {
    const { data: memberships } = await supabase
      .from("gym_memberships")
      .select("role")
      .eq("profile_id", user.id)
      .eq("status", "active")
      .limit(10);

    if (!memberships?.length) return redirectWithCookies(request, response, "/onboarding");
    if (
      (pathname.startsWith("/staff") || /^\/g\/[^/]+\/staff(?:\/|$)/.test(pathname))
      && !memberships.some(({ role }) => ["owner", "staff", "route_setter"].includes(role))
    ) {
      return redirectWithCookies(request, response, "/app");
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

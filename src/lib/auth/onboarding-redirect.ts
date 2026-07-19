export function isGymMembershipProtectedPath(pathname: string) {
  return pathname === "/app"
    || pathname.startsWith("/app/")
    || pathname === "/staff"
    || pathname.startsWith("/staff/")
    || /^\/g\/[^/]+\/(?:app|staff)(?:\/|$)/.test(pathname);
}

export function shouldRedirectToOnboarding({
  activeMembershipCount,
  lookupFailed,
  pathname,
}: Readonly<{
  activeMembershipCount: number;
  lookupFailed: boolean;
  pathname: string;
}>) {
  return isGymMembershipProtectedPath(pathname) && !lookupFailed && activeMembershipCount === 0;
}

import { describe, expect, it } from "vitest";
import { isGymMembershipProtectedPath, shouldRedirectToOnboarding } from "./onboarding-redirect";

describe("membership-empty onboarding redirects", () => {
  it.each(["/app", "/app/routes", "/staff", "/staff/team", "/g/demo/app", "/g/demo/staff/routes"])(
    "protects gym application path %s",
    (pathname) => expect(isGymMembershipProtectedPath(pathname)).toBe(true),
  );

  it.each(["/", "/login", "/register", "/onboarding", "/onboarding/create", "/visit/demo", "/platform"])(
    "does not classify public or onboarding path %s as membership-protected",
    (pathname) => expect(isGymMembershipProtectedPath(pathname)).toBe(false),
  );

  it("redirects only a successful empty membership lookup", () => {
    expect(shouldRedirectToOnboarding({ pathname: "/app", activeMembershipCount: 0, lookupFailed: false })).toBe(true);
    expect(shouldRedirectToOnboarding({ pathname: "/app", activeMembershipCount: 1, lookupFailed: false })).toBe(false);
    expect(shouldRedirectToOnboarding({ pathname: "/app", activeMembershipCount: 0, lookupFailed: true })).toBe(false);
    expect(shouldRedirectToOnboarding({ pathname: "/onboarding", activeMembershipCount: 0, lookupFailed: false })).toBe(false);
  });
});

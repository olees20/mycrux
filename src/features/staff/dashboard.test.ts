import { describe, expect, it } from "vitest";
import { gymDayRange, resolveDashboardPermissions } from "./dashboard";

describe("staff dashboard permissions", () => {
  it("limits front desk staff to reception and event work", () => {
    expect(resolveDashboardPermissions("staff", ["events.manage", "guests.check_in", "waivers.manage"])).toEqual({
      frontDesk: true, routeSetting: false, management: false, events: true, announcements: false,
    });
  });

  it("limits route setters to their operational queue", () => {
    expect(resolveDashboardPermissions("route_setter", ["routes.manage", "route_feedback.read"])).toEqual({
      frontDesk: false, routeSetting: true, management: false, events: false, announcements: false,
    });
  });

  it("gives owners all dashboard sections", () => {
    expect(Object.values(resolveDashboardPermissions("owner", []))).toEqual([true, true, true, true, true]);
  });
});

describe("gym day KPI range", () => {
  it("uses gym-local midnight across a daylight-saving transition", () => {
    expect(gymDayRange(new Date("2026-03-29T12:00:00Z"), "Europe/London")).toMatchObject({
      start: "2026-03-29T00:00:00.000Z",
      end: "2026-03-29T23:00:00.000Z",
    });
  });
});

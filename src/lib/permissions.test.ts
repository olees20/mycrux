import { describe, expect, it } from "vitest";
import { canManageStaffRole, hasPermission, type AppRole } from "./permissions";

describe("permission matrix", () => {
  const boundaries: Array<[AppRole, Parameters<typeof hasPermission>[1], boolean]> = [
    ["platform_admin", "platform.manage", true],
    ["gym_owner", "staff.assign_manager", true],
    ["gym_manager", "staff.manage", true],
    ["route_setter", "routes.manage", true],
    ["front_desk", "guests.check_in", true],
    ["moderator", "community.moderate", true],
    ["member", "personal_records.manage", true],
    ["member", "staff.manage", false],
    ["front_desk", "routes.manage", false],
    ["moderator", "billing.manage", false],
  ];

  it.each(boundaries)("evaluates %s / %s as %s", (role, permission, expected) => {
    expect(hasPermission(role, permission)).toBe(expected);
  });

  it("limits manager delegation while allowing owners to assign every staff bundle", () => {
    expect(canManageStaffRole("gym_owner", "gym_manager")).toBe(true);
    expect(canManageStaffRole("gym_manager", "gym_manager")).toBe(false);
    expect(canManageStaffRole("gym_manager", "front_desk")).toBe(true);
    expect(canManageStaffRole("route_setter", "front_desk")).toBe(false);
  });
});

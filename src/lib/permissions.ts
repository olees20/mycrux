export const permissionMatrix = {
  platform_admin: ["platform.manage"],
  gym_owner: ["gym.manage", "staff.manage", "staff.assign_manager", "billing.manage"],
  gym_manager: [
    "staff.manage", "announcements.manage", "events.manage", "routes.manage",
    "guests.manage", "waivers.manage", "competitions.manage", "community.moderate", "chat.manage",
  ],
  route_setter: ["routes.manage", "route_feedback.read", "competitions.score"],
  front_desk: ["events.manage", "guests.manage", "guests.check_in", "waivers.manage", "passes.manage"],
  moderator: ["community.moderate", "chat.manage", "route_feedback.read"],
  member: ["published_content.read", "personal_records.manage"],
} as const;

export type AppRole = keyof typeof permissionMatrix;
export type Permission = (typeof permissionMatrix)[AppRole][number];
export type StaffRoleKey = "gym_manager" | "route_setter" | "front_desk" | "moderator";

export const staffRoleKeys = ["gym_manager", "route_setter", "front_desk", "moderator"] as const;

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return (permissionMatrix[role] as readonly string[]).includes(permission);
}

export function canManageStaffRole(actorRole: AppRole, targetRole: StaffRoleKey): boolean {
  if (actorRole === "gym_owner") return true;
  return actorRole === "gym_manager" && targetRole !== "gym_manager";
}

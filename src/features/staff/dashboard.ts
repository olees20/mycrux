import { zonedDateTimeToIso } from "@/features/announcements/schedule";
import type { GymRole } from "@/lib/supabase/types";

export type DashboardPermissions = Readonly<{
  frontDesk: boolean;
  routeSetting: boolean;
  management: boolean;
  events: boolean;
  announcements: boolean;
  invitations: boolean;
}>;

export function resolveDashboardPermissions(role: GymRole, capabilities: readonly string[]): DashboardPermissions {
  const owner = role === "owner";
  const has = (capability: string) => owner || capabilities.includes(capability);
  return {
    frontDesk: has("guests.check_in") || has("passes.manage") || has("waivers.manage"),
    routeSetting: has("routes.manage") || has("route_feedback.read"),
    management: owner || has("staff.manage"),
    events: has("events.manage"),
    announcements: has("announcements.manage"),
    invitations: owner || has("staff.manage"),
  };
}

function dateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function nextDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + 1));
  return result.toISOString().slice(0, 10);
}

export function gymDayRange(reference: Date, timeZone: string) {
  const localDate = dateKey(reference, timeZone);
  return {
    label: new Intl.DateTimeFormat("en-GB", { timeZone, dateStyle: "full" }).format(reference),
    start: zonedDateTimeToIso(`${localDate}T00:00`, timeZone),
    end: zonedDateTimeToIso(`${nextDate(localDate)}T00:00`, timeZone),
  };
}

export type TimedEntitlement = Readonly<{ enabled: boolean; starts_at: string | null; ends_at: string | null }>;

export function isEntitlementActive(entitlement: TimedEntitlement | null, now = new Date()) {
  if (!entitlement?.enabled) return false;
  const timestamp = now.getTime();
  return (!entitlement.starts_at || Date.parse(entitlement.starts_at) <= timestamp)
    && (!entitlement.ends_at || Date.parse(entitlement.ends_at) > timestamp);
}

export function dateInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

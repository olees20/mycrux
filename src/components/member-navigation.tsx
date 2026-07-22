"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { GymRole } from "@/lib/supabase/types";
import { cn } from "@/lib/cn";

type NavigationMode = "member" | "staff";
type Item = { label: string; suffix: string; capability?: string; ownerOnly?: boolean };

const memberSections: { label: string; items: Item[] }[] = [
  { label: "Climb", items: [{ label: "Explore", suffix: "" }, { label: "Routes", suffix: "/routes" }, { label: "Logbook", suffix: "/logbook" }, { label: "Events", suffix: "/events" }, { label: "Community", suffix: "/community" }] },
  { label: "Discover", items: [{ label: "Competitions", suffix: "/competitions" }, { label: "Leaderboards", suffix: "/leaderboards" }, { label: "Statistics", suffix: "/statistics" }, { label: "Announcements", suffix: "/announcements" }, { label: "Chat", suffix: "/chat" }, { label: "Partners", suffix: "/partners" }] },
  { label: "Account", items: [{ label: "Notifications", suffix: "/notifications" }, { label: "Wallet", suffix: "/wallet" }, { label: "Waivers", suffix: "/waivers" }, { label: "Guest passes", suffix: "/guests" }, { label: "Profile", suffix: "/profile" }] },
];

const staffSections: { label: string; items: Item[] }[] = [
  { label: "Primary", items: [{ label: "Overview", suffix: "" }, { label: "Floorplan", suffix: "/floorplan", ownerOnly: true }, { label: "Routes", suffix: "/routes", capability: "routes.manage" }, { label: "Hold inventory", suffix: "/holds", capability: "routes.manage" }, { label: "Events", suffix: "/events", capability: "events.manage" }, { label: "Competitions", suffix: "/competitions", capability: "competitions.manage" }] },
  { label: "Operations", items: [{ label: "Check-in", suffix: "/check-in", capability: "guests.check_in" }, { label: "Guests", suffix: "/guests", capability: "guests.manage" }, { label: "Route issues", suffix: "/route-feedback", capability: "route_feedback.read" }, { label: "Announcements", suffix: "/announcements", capability: "announcements.manage" }, { label: "Waivers", suffix: "/waivers", capability: "waivers.manage" }] },
  { label: "Management", items: [{ label: "Member access", suffix: "/member-access", capability: "staff.manage" }, { label: "Team", suffix: "/team", capability: "staff.manage" }, { label: "Analytics", suffix: "/analytics", ownerOnly: true }, { label: "Route analytics", suffix: "/route-analytics", capability: "routes.manage" }, { label: "Plans & usage", suffix: "/plans", ownerOnly: true }, { label: "Billing", suffix: "/billing", ownerOnly: true }, { label: "Integrations", suffix: "/integrations", ownerOnly: true }, { label: "Privacy", suffix: "/privacy", ownerOnly: true }, { label: "Settings", suffix: "/settings", ownerOnly: true }] },
];

function canSee(item: Item, role: GymRole, capabilities: readonly string[]) {
  if (role === "owner") return true;
  if (item.ownerOnly) return false;
  if (!item.capability) return true;
  if (role === "route_setter") return ["routes.manage", "route_feedback.read"].includes(item.capability);
  return capabilities.includes(item.capability);
}

function NavLink({ href, label, compact = false }: { href: string; label: string; compact?: boolean }) {
  const pathname = usePathname();
  const current = pathname === href || (href.split("/").length > 4 && pathname.startsWith(`${href}/`));
  return <Link aria-current={current ? "page" : undefined} className={cn("flex min-h-10 items-center rounded-[var(--radius-md)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface)]/70 hover:text-[var(--foreground)] aria-[current=page]:bg-[var(--surface)] aria-[current=page]:font-bold aria-[current=page]:text-[var(--foreground)] aria-[current=page]:shadow-sm", compact ? "justify-center px-2 text-center text-[.6875rem] leading-4" : "px-3")} href={href}>{label}</Link>;
}

export function MemberNavigation({ memberBase, mode = "member", role = "member", capabilities = [] }: { memberBase: string; mode?: NavigationMode; role?: GymRole; capabilities?: readonly string[] }) {
  const sections = (mode === "staff" ? staffSections : memberSections).map((section) => ({ ...section, items: section.items.filter((item) => canSee(item, role, capabilities)) })).filter(({ items }) => items.length);
  const primary = sections[0]?.items.slice(0, 5) ?? [];
  return <>
    <nav aria-label={`${mode === "staff" ? "Staff" : "Member"} navigation`} className="mt-5 hidden min-h-0 flex-1 overflow-y-auto md:block">
      <div className="space-y-6 pb-5">{sections.map((section) => <section aria-label={section.label} key={section.label}><p className="px-3 text-[.6875rem] font-bold uppercase tracking-[.12em] text-[var(--muted)]">{section.label}</p><div className="mt-1 space-y-0.5">{section.items.map((item) => <NavLink href={`${memberBase}${item.suffix}`} key={item.suffix} label={item.label}/>)}</div></section>)}</div>
    </nav>
    <nav aria-label={`Mobile ${mode === "staff" ? "staff" : "member"} navigation`} className="fixed inset-x-0 bottom-0 z-40 grid border-t border-[var(--border)] bg-[var(--surface)]/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(23_33_27_/_0.08)] backdrop-blur md:hidden" style={{ gridTemplateColumns: `repeat(${primary.length}, minmax(0, 1fr))` }}>{primary.map((item) => <NavLink compact href={`${memberBase}${item.suffix}`} key={item.suffix} label={item.label}/>)}</nav>
    <details className="group relative md:hidden"><summary className="flex min-h-11 list-none items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold marker:content-none">Menu</summary><div className="fixed inset-x-3 top-[4.5rem] z-50 max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-md)]"><nav aria-label={`All ${mode} pages`} className="space-y-5">{sections.map((section) => <section aria-label={section.label} key={section.label}><p className="px-2 text-[.6875rem] font-bold uppercase tracking-[.12em] text-[var(--muted)]">{section.label}</p><div className="mt-1 grid grid-cols-2 gap-1">{section.items.map((item) => <NavLink href={`${memberBase}${item.suffix}`} key={item.suffix} label={item.label}/>)}</div></section>)}</nav></div></details>
  </>;
}

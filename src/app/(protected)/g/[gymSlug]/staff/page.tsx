import Link from "next/link";
import { gymDayRange, resolveDashboardPermissions } from "@/features/staff/dashboard";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

type EventItem = { id: string; title: string; starts_at: string; location: string | null; event_registrations: { status: string }[] };
type GuestItem = { id: string; guest_name: string; status: string; expires_at: string };
type CheckInItem = { id: string; checked_in_at: string; source: string; member: { display_name: string } | null; guest_invites: { guest_name: string } | null };
type RouteIssue = { id: string; feedback_kind: string; issue_status: string; created_at: string; comment: string | null; routes: { name: string | null; colour: string; grade: string } | null };
type AnnouncementItem = { id: string; title: string; status: string; published_at: string | null };
type InvitationItem = { id: string; email: string; role: string; expires_at: string };

function Kpi({ value, label, definition }: { value: number; label: string; definition: string }) {
  return <article className="rounded-2xl border border-[var(--border)] bg-white p-5"><p className="text-4xl font-black tabular-nums">{value}</p><h2 className="mt-2 font-black">{label}</h2><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{definition}</p></article>;
}

function Queue({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[var(--border)] bg-white p-5"><h2 className="text-xl font-black">{title}</h2><p className="mt-1 text-sm text-[var(--muted)]">{description}</p><div className="mt-5">{children}</div></section>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{children}</p>;
}

export default async function StaffPage({ params }: { params: Promise<{ gymSlug: string }> }) {
  const { gymSlug } = await params;
  const { gym } = await requireActiveGymContext({ gymSlug, allowedRoles: ["owner", "staff", "route_setter"] });
  const supabase = await createServerComponentSupabaseClient();
  const [{ data: settings }, { data: membership }] = await Promise.all([
    supabase.from("gyms").select("timezone").eq("id", gym.id).single(),
    supabase.from("gym_memberships").select("staff_role_id").eq("id", gym.membershipId).single(),
  ]);
  const { data: staffRole } = membership?.staff_role_id
    ? await supabase.from("staff_roles").select("key,name,capabilities").eq("id", membership.staff_role_id).single()
    : { data: null };
  const permissions = resolveDashboardPermissions(gym.role, staffRole?.capabilities ?? []);
  const timezone = settings?.timezone ?? "Europe/London";
  const range = gymDayRange(new Date(), timezone);

  let events: EventItem[] = [];
  let guests: GuestItem[] = [];
  let checkIns: CheckInItem[] = [];
  let routeIssues: RouteIssue[] = [];
  let announcements: AnnouncementItem[] = [];
  let invitations: InvitationItem[] = [];
  let waiverExceptionIds = new Set<string>();

  if (permissions.events) {
    const { data } = await supabase.from("events").select("id,title,starts_at,location,event_registrations(status)").eq("gym_id", gym.id).eq("status", "published").gte("starts_at", range.start).lt("starts_at", range.end).order("starts_at");
    events = data ?? [];
  }
  if (permissions.frontDesk) {
    const [{ data: guestData }, { data: checkInData }, { data: requiredVersions }] = await Promise.all([
      supabase.from("guest_invites").select("id,guest_name,status,expires_at").eq("gym_id", gym.id).in("status", ["pending", "registered"]).gte("expires_at", range.start).lt("expires_at", range.end).order("expires_at"),
      supabase.from("check_ins").select("id,checked_in_at,source,member:profiles!check_ins_profile_id_fkey(display_name),guest_invites(guest_name)").eq("gym_id", gym.id).gte("checked_in_at", range.start).lt("checked_in_at", range.end).order("checked_in_at", { ascending: false }),
      supabase.from("waiver_versions").select("id,waivers!inner(is_required,archived_at)").eq("gym_id", gym.id).eq("status", "published").lte("effective_at", new Date().toISOString()).eq("waivers.is_required", true).is("waivers.archived_at", null),
    ]);
    guests = guestData ?? [];
    checkIns = checkInData ?? [];
    const requiredIds = (requiredVersions ?? []).map(({ id }) => id);
    if (guests.length && requiredIds.length) {
      const { data: acceptances } = await supabase.from("waiver_acceptances").select("guest_invite_id,waiver_version_id").eq("gym_id", gym.id).in("guest_invite_id", guests.map(({ id }) => id)).in("waiver_version_id", requiredIds).is("revoked_at", null);
      const accepted = new Set((acceptances ?? []).map(({ guest_invite_id, waiver_version_id }) => `${guest_invite_id}:${waiver_version_id}`));
      waiverExceptionIds = new Set(guests.filter((guest) => requiredIds.some((versionId) => !accepted.has(`${guest.id}:${versionId}`))).map(({ id }) => id));
    }
  }
  if (permissions.routeSetting) {
    const { data } = await supabase.from("route_feedback").select("id,feedback_kind,issue_status,created_at,comment,routes(name,colour,grade)").eq("gym_id", gym.id).in("feedback_kind", ["spinning_hold", "dirty_hold", "other_issue"]).in("issue_status", ["open", "reviewing"]).is("archived_at", null).order("created_at");
    routeIssues = data ?? [];
  }
  if (permissions.announcements) {
    const { data } = await supabase.from("announcements").select("id,title,status,published_at").eq("gym_id", gym.id).in("status", ["draft", "published"]).is("archived_at", null).order("created_at", { ascending: false });
    announcements = data ?? [];
  }
  if (permissions.invitations) {
    const { data } = await supabase.from("invitations").select("id,email,role,expires_at").eq("gym_id", gym.id).eq("status", "pending").order("expires_at");
    invitations = data ?? [];
  }

  const roleName = gym.role === "owner" ? "Owner" : staffRole?.name ?? (gym.role === "route_setter" ? "Route setter" : "Staff");
  const time = (value: string) => new Intl.DateTimeFormat("en-GB", { timeZone: timezone, timeStyle: "short" }).format(new Date(value));
  const quickActions = [
    ...(permissions.frontDesk ? [["Check in", "check-in"], ["Guests", "guests"]] : []),
    ...(permissions.routeSetting ? [["Routes", "routes"], ["Route issues", "route-feedback"], ["Route analytics", "route-analytics"]] : []),
    ...(permissions.events ? [["Events", "events"]] : []),
    ...(permissions.announcements ? [["Announcements", "announcements"]] : []),
    ...(permissions.management ? [["Team access", "team"]] : []),
    ...(gym.role === "owner" ? [["Gym settings", "settings"]] : []),
  ];

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--muted)]">{roleName} command centre</p><h1 className="mt-2 text-4xl font-black">Today at {gym.name}</h1><p className="mt-2 text-sm text-[var(--muted)]">{range.label} · {timezone}</p></div><div className="flex max-w-2xl flex-wrap gap-2">{quickActions.map(([label, path]) => <Link className="inline-flex min-h-12 items-center rounded-xl bg-[var(--foreground)] px-5 text-sm font-bold text-white" href={`/g/${gym.slug}/staff/${path}`} key={path}>{label}</Link>)}</div></div>

    <section aria-label="Today's operational KPIs" className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {permissions.events ? <Kpi definition={`Published events starting during ${range.label} in ${timezone}.`} label="Events today" value={events.length} /> : null}
      {permissions.frontDesk ? <Kpi definition={`Recorded member and guest check-ins since local midnight; this is not an occupancy figure.`} label="Check-ins today" value={checkIns.length} /> : null}
      {permissions.frontDesk ? <Kpi definition={`Pending or registered guest passes expiring during ${range.label}.`} label="Guest arrivals due" value={guests.length} /> : null}
      {permissions.frontDesk ? <Kpi definition="Today's due guests missing at least one currently required waiver." label="Waiver exceptions" value={waiverExceptionIds.size} /> : null}
      {permissions.routeSetting ? <Kpi definition="Open or under-review spinning hold, dirty hold and other route issues; all dates." label="Open route issues" value={routeIssues.length} /> : null}
      {permissions.invitations ? <Kpi definition="Pending staff invitations that have not yet been accepted, revoked or expired by workflow state." label="Pending invitations" value={invitations.length} /> : null}
      {permissions.announcements ? <Kpi definition="Current announcement records in draft state; all creation dates." label="Draft announcements" value={announcements.filter(({ status }) => status === "draft").length} /> : null}
    </section>

    <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
      {permissions.frontDesk ? <Queue description="Guests, waiver blockers and the latest arrivals for reception." title="Front desk queue"><div className="space-y-3">{guests.slice(0, 8).map((guest) => <Link className="flex min-h-14 items-center justify-between gap-4 rounded-xl bg-stone-50 p-4" href={`/g/${gym.slug}/staff/guests`} key={guest.id}><span><strong className="block">{guest.guest_name}</strong><span className="text-xs text-[var(--muted)]">Due by {time(guest.expires_at)} · {guest.status}</span></span>{waiverExceptionIds.has(guest.id) ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Waiver needed</span> : <span className="text-xs font-bold text-emerald-700">Ready</span>}</Link>)}{guests.length ? null : <Empty>No guest arrivals are due today.</Empty>}</div><h3 className="mt-6 font-black">Recent check-ins</h3><ul className="mt-2 divide-y">{checkIns.slice(0, 8).map((item) => <li className="flex justify-between gap-3 py-3 text-sm" key={item.id}><span className="font-semibold">{item.member?.display_name ?? item.guest_invites?.guest_name ?? "Visitor"}</span><span className="text-[var(--muted)]">{time(item.checked_in_at)} · {item.source.replaceAll("_", " ")}</span></li>)}</ul></Queue> : null}

      {permissions.events ? <Queue description={`Published events beginning today in ${timezone}.`} title="Today's events"><div className="space-y-3">{events.map((event) => { const booked = event.event_registrations.filter(({ status }) => status === "registered").length; return <Link className="block min-h-14 rounded-xl bg-stone-50 p-4" href={`/g/${gym.slug}/staff/events`} key={event.id}><strong>{time(event.starts_at)} · {event.title}</strong><span className="mt-1 block text-xs text-[var(--muted)]">{event.location ?? "Location TBC"} · {booked} booked</span></Link>; })}{events.length ? null : <Empty>No published events start today.</Empty>}</div></Queue> : null}

      {permissions.routeSetting ? <Queue description="Oldest unresolved safety and maintenance feedback first." title="Route-setting queue"><div className="space-y-3">{routeIssues.slice(0, 10).map((issue) => <Link className="block min-h-14 rounded-xl bg-stone-50 p-4" href={`/g/${gym.slug}/staff/route-feedback`} key={issue.id}><span className="text-xs font-bold uppercase text-amber-800">{issue.feedback_kind.replaceAll("_", " ")} · {issue.issue_status}</span><strong className="mt-1 block">{issue.routes?.name || `${issue.routes?.colour ?? "Route"} ${issue.routes?.grade ?? ""}`}</strong>{issue.comment ? <span className="mt-1 line-clamp-2 block text-sm text-[var(--muted)]">{issue.comment}</span> : null}</Link>)}{routeIssues.length ? null : <Empty>No unresolved route issues.</Empty>}</div></Queue> : null}

      {permissions.management ? <Queue description="Publishing and access work that needs management attention." title="Manager queue"><div className="space-y-5">{permissions.announcements ? <div><div className="flex items-center justify-between"><h3 className="font-black">Announcements</h3><Link className="text-sm font-bold underline" href={`/g/${gym.slug}/staff/announcements`}>Manage</Link></div><ul className="mt-2 space-y-2">{announcements.slice(0, 4).map((item) => <li className="rounded-lg bg-stone-50 p-3 text-sm" key={item.id}><strong>{item.title}</strong><span className="ml-2 text-xs uppercase text-[var(--muted)]">{item.status}</span></li>)}</ul></div> : null}{permissions.invitations ? <div><div className="flex items-center justify-between"><h3 className="font-black">Pending invitations</h3><Link className="text-sm font-bold underline" href={`/g/${gym.slug}/staff/team`}>Manage</Link></div><ul className="mt-2 space-y-2">{invitations.slice(0, 8).map((item) => <li className="rounded-lg bg-stone-50 p-3 text-sm" key={item.id}><strong>{item.email}</strong><span className="block text-xs text-[var(--muted)]">{item.role} · expires {new Intl.DateTimeFormat("en-GB", { timeZone: timezone, dateStyle: "medium" }).format(new Date(item.expires_at))}</span></li>)}</ul></div> : null}</div></Queue> : null}
    </div>
  </div>;
}

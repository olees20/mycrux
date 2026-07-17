import Link from "next/link";
import { PlaceholderPage } from "@/components/placeholder-page";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export default async function StaffPage({ params }: { params: Promise<{ gymSlug: string }> }) {
  const { gymSlug } = await params;
  const { gym } = await requireActiveGymContext({ gymSlug, allowedRoles: ["owner", "staff", "route_setter"] });
  let canManageTeam = gym.role === "owner";
  let canManageAnnouncements = gym.role === "owner";
  let canManageRoutes = gym.role === "owner" || gym.role === "route_setter";
  let canTriageRouteFeedback = gym.role === "owner" || gym.role === "route_setter";
  let canManageWaivers = gym.role === "owner";
  let canManageGuests = gym.role === "owner";
  if (gym.role === "staff") {
    const supabase = await createServerComponentSupabaseClient();
    const { data: membership } = await supabase.from("gym_memberships").select("staff_role_id").eq("id", gym.membershipId).single();
    if (membership?.staff_role_id) {
      const { data: role } = await supabase.from("staff_roles").select("key,capabilities").eq("id", membership.staff_role_id).single();
      canManageTeam = role?.key === "gym_manager";
      canManageAnnouncements = role?.capabilities.includes("announcements.manage") ?? false;
      canManageRoutes = role?.capabilities.includes("routes.manage") ?? false;
      canTriageRouteFeedback = role?.capabilities.includes("route_feedback.read") ?? false;
      canManageWaivers = role?.capabilities.includes("waivers.manage") ?? false;
      canManageGuests = (role?.capabilities.includes("guests.check_in") ?? false) || (role?.capabilities.includes("passes.manage") ?? false);
    }
  }
  return <><PlaceholderPage eyebrow="Staff area" title="Run the gym." description="Operational tools for your team." /><div className="mx-auto mt-8 flex max-w-4xl flex-wrap gap-3">{canManageGuests ? <><Link className="inline-flex min-h-11 items-center rounded-full bg-[var(--foreground)] px-5 text-sm font-bold text-white" href={`/g/${gymSlug}/staff/check-in`}>Member check-in</Link><Link className="inline-flex min-h-11 items-center rounded-full bg-[var(--foreground)] px-5 text-sm font-bold text-white" href={`/g/${gymSlug}/staff/guests`}>Guests and day passes</Link></> : null}{canManageRoutes ? <Link className="inline-flex min-h-11 items-center rounded-full bg-[var(--foreground)] px-5 text-sm font-bold text-white" href={`/g/${gymSlug}/staff/routes`}>Manage walls and routes</Link> : null}{canTriageRouteFeedback ? <Link className="inline-flex min-h-11 items-center rounded-full bg-[var(--foreground)] px-5 text-sm font-bold text-white" href={`/g/${gymSlug}/staff/route-feedback`}>Triage route feedback</Link> : null}{canManageWaivers ? <Link className="inline-flex min-h-11 items-center rounded-full bg-[var(--foreground)] px-5 text-sm font-bold text-white" href={`/g/${gymSlug}/staff/waivers`}>Manage waivers</Link> : null}{canManageTeam ? <Link className="inline-flex min-h-11 items-center rounded-full bg-[var(--foreground)] px-5 text-sm font-bold text-white" href={`/g/${gymSlug}/staff/team`}>Manage team access</Link> : null}{canManageAnnouncements ? <Link className="inline-flex min-h-11 items-center rounded-full bg-[var(--foreground)] px-5 text-sm font-bold text-white" href={`/g/${gymSlug}/staff/announcements`}>Manage announcements</Link> : null}{gym.role === "owner" ? <Link className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] bg-white px-5 text-sm font-bold" href={`/g/${gymSlug}/staff/settings`}>Gym settings</Link> : null}</div></>;
}

import Link from "next/link";
import { PlaceholderPage } from "@/components/placeholder-page";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export default async function StaffPage({ params }: { params: Promise<{ gymSlug: string }> }) {
  const { gymSlug } = await params;
  const { gym } = await requireActiveGymContext({ gymSlug, allowedRoles: ["owner", "staff", "route_setter"] });
  let canManageTeam = gym.role === "owner";
  if (gym.role === "staff") {
    const supabase = await createServerComponentSupabaseClient();
    const { data: membership } = await supabase.from("gym_memberships").select("staff_role_id").eq("id", gym.membershipId).single();
    if (membership?.staff_role_id) {
      const { data: role } = await supabase.from("staff_roles").select("key").eq("id", membership.staff_role_id).single();
      canManageTeam = role?.key === "gym_manager";
    }
  }
  return <><PlaceholderPage eyebrow="Staff area" title="Run the gym." description="Operational tools and gym management will be added in later stages." />{canManageTeam ? <div className="mx-auto mt-8 max-w-4xl"><Link className="inline-flex min-h-11 items-center rounded-full bg-[var(--foreground)] px-5 text-sm font-bold text-white" href={`/g/${gymSlug}/staff/team`}>Manage team access</Link></div> : null}</>;
}

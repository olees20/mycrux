import Link from "next/link";
import { notFound } from "next/navigation";
import { PromoteMemberForm, StaffAccessForm } from "@/components/staff-team-controls";
import { canManageStaffRole, type AppRole, type StaffRoleKey } from "@/lib/permissions";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export default async function StaffTeamPage({ params }: { params: Promise<{ gymSlug: string }> }) {
  const { gymSlug } = await params;
  const { gym } = await requireActiveGymContext({ gymSlug, allowedRoles: ["owner", "staff"] });
  const supabase = await createServerComponentSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  const { data: roleRows } = await supabase.from("staff_roles").select("id,key,name").eq("gym_id", gym.id).eq("is_system", true).is("archived_at", null);
  const rolesById = new Map((roleRows ?? []).map((role) => [role.id, role]));
  const ownRole = gym.role === "owner" ? "gym_owner" : rolesById.get((await supabase.from("gym_memberships").select("staff_role_id").eq("id", gym.membershipId).single()).data?.staff_role_id ?? "")?.key;
  if (ownRole !== "gym_owner" && ownRole !== "gym_manager") notFound();
  const actorRole = ownRole as AppRole;
  const { data: memberships } = await supabase.from("gym_memberships").select("id,profile_id,role,staff_role_id,status,joined_at,suspended_at").eq("gym_id", gym.id).neq("role", "owner").order("created_at");
  const profileIds = (memberships ?? []).map(({ profile_id }) => profile_id);
  const { data: profiles } = profileIds.length ? await supabase.from("profiles").select("id,display_name").in("id", profileIds) : { data: [] };
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const canAssignManager = actorRole === "gym_owner";
  const members = (memberships ?? []).filter(({ role }) => role === "member");
  const staff = (memberships ?? []).filter(({ role }) => role === "staff" || role === "route_setter");

  return <div className="mx-auto max-w-6xl"><p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Gym access</p><h1 className="mt-3 text-4xl font-black">Team access</h1><p className="mt-3 max-w-3xl text-[var(--muted)]">Members join through the gym QR or short code. Authorised managers can then assign operational staff roles here; public codes can never assign privileged access.</p><Link className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[var(--foreground)] px-5 text-sm font-bold text-white" href={`/g/${gym.slug}/staff/member-access`}>Open member access QR</Link><section className="mt-10"><h2 className="text-xl font-black">Members eligible for staff access</h2><p className="mt-2 text-sm text-[var(--muted)]">Confirm the person’s identity and responsibilities before assigning a role.</p><ul className="mt-4 grid gap-4 md:grid-cols-2">{members.map((membership) => <li className="rounded-2xl border border-[var(--border)] bg-white p-5" key={membership.id}><p className="font-bold">{profilesById.get(membership.profile_id)?.display_name ?? "Member"}</p><p className="mt-1 text-sm text-[var(--muted)]">Member · {membership.status}</p>{membership.status === "active" && membership.profile_id !== authData.user?.id ? <PromoteMemberForm canAssignManager={canAssignManager} gymSlug={gym.slug} membershipId={membership.id}/> : <p className="mt-3 text-xs text-[var(--muted)]">This membership is not eligible for role assignment.</p>}</li>)}</ul>{members.length ? null : <p className="mt-4 rounded-2xl bg-stone-50 p-5 text-sm text-[var(--muted)]">No members have joined yet. Display the member QR to get started.</p>}</section><section className="mt-10"><h2 className="text-xl font-black">Current staff</h2><ul className="mt-4 grid gap-4 md:grid-cols-2">{staff.map((membership) => { const role = rolesById.get(membership.staff_role_id ?? "")?.key as StaffRoleKey | undefined; if (!role) return null; const manageable = membership.profile_id !== authData.user?.id && canManageStaffRole(actorRole, role); return <li className="rounded-2xl border border-[var(--border)] bg-white p-5" key={membership.id}><p className="font-bold">{profilesById.get(membership.profile_id)?.display_name ?? "Staff member"}</p><p className="mt-1 text-sm text-[var(--muted)]">{rolesById.get(membership.staff_role_id ?? "")?.name} · {membership.status}</p>{manageable ? <StaffAccessForm canAssignManager={canAssignManager} gymSlug={gym.slug} membershipId={membership.id} role={role} status={membership.status}/> : <p className="mt-3 text-xs text-[var(--muted)]">You cannot change this access assignment.</p>}</li>; })}</ul></section></div>;
}

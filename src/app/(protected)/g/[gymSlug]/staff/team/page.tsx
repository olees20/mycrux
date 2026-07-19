import { notFound } from "next/navigation";
import { InviteStaffForm, InvitationControls, StaffAccessForm } from "@/components/staff-team-controls";
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

  const [{ data: memberships }, { data: invitations }] = await Promise.all([
    supabase.from("gym_memberships").select("id,profile_id,role,staff_role_id,status,joined_at,suspended_at").eq("gym_id", gym.id).in("role", ["staff", "route_setter"]).order("created_at"),
    supabase.from("invitations").select("id,email,role,staff_role_id,status,expires_at,created_at").eq("gym_id", gym.id).order("created_at", { ascending: false }),
  ]);
  const profileIds = (memberships ?? []).map(({ profile_id }) => profile_id);
  const { data: profiles } = profileIds.length ? await supabase.from("profiles").select("id,display_name").in("id", profileIds) : { data: [] };
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const canAssignManager = actorRole === "gym_owner";

  return <div className="mx-auto max-w-6xl"><p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Gym access</p><h1 className="mt-3 text-4xl font-black">Team and invitations</h1><p className="mt-3 max-w-3xl text-[var(--muted)]">Invite members or staff with email-bound, expiring single-use links, assign operational roles, and suspend staff access without deleting audit history.</p><section className="mt-8 rounded-2xl border border-[var(--border)] bg-white p-5"><h2 className="text-xl font-black">Create invitation</h2><InviteStaffForm canAssignManager={canAssignManager} gymSlug={gym.slug} /></section><section className="mt-8"><h2 className="text-xl font-black">Current staff</h2><ul className="mt-4 grid gap-4 md:grid-cols-2">{(memberships ?? []).map((membership) => { const role = rolesById.get(membership.staff_role_id ?? "")?.key as StaffRoleKey | undefined; if (!role) return null; const manageable = membership.profile_id !== authData.user?.id && canManageStaffRole(actorRole, role); return <li className="rounded-2xl border border-[var(--border)] bg-white p-5" key={membership.id}><p className="font-bold">{profilesById.get(membership.profile_id)?.display_name ?? "Staff member"}</p><p className="mt-1 text-sm text-[var(--muted)]">{rolesById.get(membership.staff_role_id ?? "")?.name} · {membership.status}</p>{manageable ? <StaffAccessForm canAssignManager={canAssignManager} gymSlug={gym.slug} membershipId={membership.id} role={role} status={membership.status} /> : <p className="mt-3 text-xs text-[var(--muted)]">You cannot change this access assignment.</p>}</li>; })}</ul></section><section className="mt-8"><h2 className="text-xl font-black">Invitations</h2><ul className="mt-4 grid gap-4 md:grid-cols-2">{(invitations ?? []).map((invitation) => { const role = rolesById.get(invitation.staff_role_id ?? "")?.key as StaffRoleKey | undefined; const manageable = invitation.role === "member" || (role ? canManageStaffRole(actorRole, role) : false); return <li className="rounded-2xl border border-[var(--border)] bg-white p-5" key={invitation.id}><p className="font-bold">{invitation.email}</p><p className="mt-1 text-sm text-[var(--muted)]">{invitation.role === "member" ? "Member" : rolesById.get(invitation.staff_role_id ?? "")?.name ?? "Staff"} · {invitation.status} · expires {new Date(invitation.expires_at).toLocaleDateString("en-GB")}</p>{invitation.status === "pending" && manageable ? <InvitationControls gymSlug={gym.slug} invitationId={invitation.id} /> : null}</li>; })}</ul></section></div>;
}

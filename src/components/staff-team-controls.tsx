"use client";

import { useActionState } from "react";
import {
  inviteStaffAction,
  resendStaffInvitationAction,
  revokeStaffInvitationAction,
  updateStaffAccessAction,
} from "@/features/staff/actions";
import { initialStaffActionState } from "@/features/staff/state";
import type { StaffRoleKey } from "@/lib/permissions";

const roleLabels: Record<StaffRoleKey, string> = {
  gym_manager: "Gym manager",
  route_setter: "Route setter",
  front_desk: "Front desk",
  moderator: "Moderator",
};

function ActionResult({ state }: { state: typeof initialStaffActionState }) {
  if (!state.message) return null;
  return <div aria-live="polite" className={state.status === "error" ? "mt-3 text-sm text-red-700" : "mt-3 text-sm text-green-800"}><p>{state.message}</p>{state.invitationUrl ? <p className="mt-2 break-all rounded-lg bg-stone-100 p-3 font-mono text-xs">{state.invitationUrl}</p> : null}</div>;
}

function RoleOptions({ canAssignManager }: { canAssignManager: boolean }) {
  return <>{(Object.entries(roleLabels) as Array<[StaffRoleKey, string]>).filter(([key]) => canAssignManager || key !== "gym_manager").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</>;
}

export function InviteStaffForm({ gymSlug, canAssignManager }: { gymSlug: string; canAssignManager: boolean }) {
  const [state, action, pending] = useActionState(inviteStaffAction, initialStaffActionState);
  return <form action={action} className="mt-5 grid gap-4 md:grid-cols-[1fr_14rem_auto] md:items-end"><input name="gymSlug" type="hidden" value={gymSlug} /><label className="text-sm font-semibold">Email<input className="mt-2 min-h-11 w-full rounded-lg border border-[var(--border)] px-3 font-normal" name="email" required type="email" /></label><label className="text-sm font-semibold">Role<select className="mt-2 min-h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 font-normal" name="role"><RoleOptions canAssignManager={canAssignManager} /></select></label><button className="min-h-11 rounded-lg bg-[var(--foreground)] px-5 text-sm font-bold text-white disabled:opacity-60" disabled={pending}>{pending ? "Creating…" : "Create invitation"}</button><div className="md:col-span-3"><ActionResult state={state} /></div></form>;
}

export function InvitationControls({ gymSlug, invitationId }: { gymSlug: string; invitationId: string }) {
  const [resendState, resendAction, resendPending] = useActionState(resendStaffInvitationAction, initialStaffActionState);
  const [revokeState, revokeAction, revokePending] = useActionState(revokeStaffInvitationAction, initialStaffActionState);
  return <div className="mt-3"><div className="flex flex-wrap gap-2"><form action={resendAction}><input name="gymSlug" type="hidden" value={gymSlug} /><input name="invitationId" type="hidden" value={invitationId} /><button className="min-h-9 rounded-lg border border-[var(--border)] px-3 text-xs font-bold" disabled={resendPending}>{resendPending ? "Creating…" : "New link"}</button></form><form action={revokeAction}><input name="gymSlug" type="hidden" value={gymSlug} /><input name="invitationId" type="hidden" value={invitationId} /><button className="min-h-9 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700" disabled={revokePending}>{revokePending ? "Revoking…" : "Revoke"}</button></form></div><ActionResult state={resendState} /><ActionResult state={revokeState} /></div>;
}

export function StaffAccessForm({ gymSlug, membershipId, role, status, canAssignManager }: { gymSlug: string; membershipId: string; role: StaffRoleKey; status: string; canAssignManager: boolean }) {
  const [state, action, pending] = useActionState(updateStaffAccessAction, initialStaffActionState);
  return <form action={action} className="mt-3 flex flex-wrap items-end gap-2"><input name="gymSlug" type="hidden" value={gymSlug} /><input name="membershipId" type="hidden" value={membershipId} /><label className="text-xs font-semibold">Role<select className="mt-1 block min-h-10 rounded-lg border border-[var(--border)] bg-white px-2" defaultValue={role} name="role"><RoleOptions canAssignManager={canAssignManager || role === "gym_manager"} /></select></label><label className="text-xs font-semibold">Status<select className="mt-1 block min-h-10 rounded-lg border border-[var(--border)] bg-white px-2" defaultValue={status} name="status"><option value="active">Active</option><option value="suspended">Suspended</option><option value="left">Left</option></select></label><button className="min-h-10 rounded-lg bg-[var(--foreground)] px-3 text-xs font-bold text-white disabled:opacity-60" disabled={pending}>{pending ? "Saving…" : "Save"}</button><div className="basis-full"><ActionResult state={state} /></div></form>;
}

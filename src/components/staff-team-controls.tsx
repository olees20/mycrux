"use client";

import { Select } from "@/components/ui/form-controls";

import { useActionState } from "react";
import { updateStaffAccessAction } from "@/features/staff/actions";
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
  return <div aria-live="polite" className={state.status === "error" ? "mt-3 text-sm text-red-700" : "mt-3 text-sm text-green-800"}><p>{state.message}</p></div>;
}

function RoleOptions({ canAssignManager }: { canAssignManager: boolean }) {
  return <>{(Object.entries(roleLabels) as Array<[StaffRoleKey, string]>).filter(([key]) => canAssignManager || key !== "gym_manager").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</>;
}

export function StaffAccessForm({ gymSlug, membershipId, role, status, canAssignManager }: { gymSlug: string; membershipId: string; role: StaffRoleKey; status: string; canAssignManager: boolean }) {
  const [state, action, pending] = useActionState(updateStaffAccessAction, initialStaffActionState);
  return <form action={action} className="mt-3 flex flex-wrap items-end gap-2"><input name="gymSlug" type="hidden" value={gymSlug} /><input name="membershipId" type="hidden" value={membershipId} /><label className="text-xs font-semibold">Role<Select className="mt-1 block min-h-10 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2" defaultValue={role} name="role"><RoleOptions canAssignManager={canAssignManager || role === "gym_manager"} /></Select></label><label className="text-xs font-semibold">Status<Select className="mt-1 block min-h-10 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2" defaultValue={status} name="status"><option value="active">Active</option><option value="suspended">Suspended</option><option value="left">Left</option></Select></label><button className="min-h-10 rounded-[var(--radius-sm)] bg-[var(--foreground)] px-3 text-xs font-bold text-white disabled:opacity-60" disabled={pending}>{pending ? "Saving…" : "Save"}</button><div className="basis-full"><ActionResult state={state} /></div></form>;
}

export function PromoteMemberForm({ gymSlug, membershipId, canAssignManager }: { gymSlug: string; membershipId: string; canAssignManager: boolean }) {
  const [state, action, pending] = useActionState(updateStaffAccessAction, initialStaffActionState);
  return <form action={action} className="mt-3 flex flex-wrap items-end gap-2"><input name="gymSlug" type="hidden" value={gymSlug}/><input name="membershipId" type="hidden" value={membershipId}/><input name="status" type="hidden" value="active"/><label className="text-xs font-semibold">Assign staff role<Select className="mt-1 block min-h-10 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2" name="role"><RoleOptions canAssignManager={canAssignManager}/></Select></label><button className="min-h-10 rounded-[var(--radius-sm)] bg-[var(--foreground)] px-3 text-xs font-bold text-white disabled:opacity-60" disabled={pending}>{pending ? "Assigning…" : "Assign staff access"}</button><div className="basis-full"><ActionResult state={state}/></div></form>;
}

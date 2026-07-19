"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  acceptInvitationAction,
  requestMembershipAction,
} from "@/features/auth/actions";
import { initialAuthActionState } from "@/features/auth/state";
import { invitationStatusMessage, type InvitationLifecycleState } from "@/features/auth/invitations";

export function InvitationForm({ token, status }: { token?: string; status?: { state: InvitationLifecycleState; gymName?: string | null; role?: string | null } }) {
  const [state, action, pending] = useActionState(acceptInvitationAction, initialAuthActionState);
  return (
    <form action={action} className="mt-4 space-y-3">
      {status ? <div className={`rounded-xl p-4 text-sm font-semibold ${status.state === "valid" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`} role="status"><p>{invitationStatusMessage(status.state, status.gymName)}</p>{status.state === "valid" && status.role ? <p className="mt-1 text-xs font-normal">Assigned access: {status.role.replaceAll("_", " ")}</p> : null}</div> : null}
      <label className="block text-sm font-semibold">Invitation code or token
        <input className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] px-4 font-normal" defaultValue={token} name="token" required />
      </label>
      <ActionMessage state={state} />
      <Button disabled={pending} type="submit">{pending ? "Joining…" : "Accept invitation"}</Button>
    </form>
  );
}

export function MembershipRequestButton({ gymId }: { gymId: string }) {
  const [state, action, pending] = useActionState(requestMembershipAction, initialAuthActionState);
  return (
    <form action={action}>
      <input name="gymId" type="hidden" value={gymId} />
      <Button disabled={pending} type="submit" variant="secondary">{pending ? "Sending…" : "Request to join"}</Button>
      <ActionMessage state={state} />
    </form>
  );
}

function ActionMessage({ state }: { state: { status: string; message?: string } }) {
  const message = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.message) message.current?.focus();
  }, [state.message]);
  return state.message ? <p aria-live="polite" className={state.status === "error" ? "mt-2 text-sm text-red-700 outline-none" : "mt-2 text-sm text-green-800 outline-none"} ref={message} role={state.status === "error" ? "alert" : "status"} tabIndex={-1}>{state.message}</p> : null;
}

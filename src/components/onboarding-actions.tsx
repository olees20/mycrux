"use client";

import { useActionState } from "react";
import {
  acceptInvitationAction,
  requestMembershipAction,
} from "@/features/auth/actions";
import { initialAuthActionState } from "@/features/auth/state";

export function InvitationForm({ token }: { token?: string }) {
  const [state, action, pending] = useActionState(acceptInvitationAction, initialAuthActionState);
  return (
    <form action={action} className="mt-4 space-y-3">
      <label className="block text-sm font-semibold">Invitation code or token
        <input className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] px-4 font-normal" defaultValue={token} name="token" required />
      </label>
      <ActionMessage state={state} />
      <button className="min-h-11 rounded-full bg-[var(--foreground)] px-5 font-bold text-white disabled:opacity-60" disabled={pending}>{pending ? "Joining…" : "Accept invitation"}</button>
    </form>
  );
}

export function MembershipRequestButton({ gymId }: { gymId: string }) {
  const [state, action, pending] = useActionState(requestMembershipAction, initialAuthActionState);
  return (
    <form action={action}>
      <input name="gymId" type="hidden" value={gymId} />
      <button className="min-h-11 rounded-full border border-[var(--border)] bg-white px-4 text-sm font-bold disabled:opacity-60" disabled={pending}>{pending ? "Sending…" : "Request to join"}</button>
      <ActionMessage state={state} />
    </form>
  );
}

function ActionMessage({ state }: { state: { status: string; message?: string } }) {
  return state.message ? <p aria-live="polite" className={state.status === "error" ? "mt-2 text-sm text-red-700" : "mt-2 text-sm text-green-800"}>{state.message}</p> : null;
}

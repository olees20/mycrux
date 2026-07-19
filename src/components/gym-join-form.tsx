"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { joinGymAction } from "@/features/gym-access/actions";
import type { GymJoinState } from "@/features/gym-access/core";
import { gymJoinStatusMessage } from "@/features/gym-access/core";
import { initialGymJoinActionState } from "@/features/gym-access/state";

export function GymJoinConfirmation({
  gymName,
  gymSlug,
  joinState,
  kind,
  reference,
}: {
  gymName?: string | null;
  gymSlug?: string | null;
  joinState: GymJoinState;
  kind: "qr" | "code";
  reference: string;
}) {
  const [state, action, pending] = useActionState(joinGymAction, initialGymJoinActionState);
  const message = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (state.message) message.current?.focus(); }, [state.message]);
  const valid = joinState === "valid";
  const alreadyMember = joinState === "already_member" && gymSlug;
  return (
    <section aria-labelledby="join-confirmation-heading" className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Member access</p>
      <h1 className="mt-3 text-3xl font-black sm:text-4xl" id="join-confirmation-heading">
        {valid ? `Join ${gymName ?? "this gym"}` : "Gym access status"}
      </h1>
      <p className={`mt-5 rounded-2xl p-4 font-semibold ${valid || alreadyMember ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950"}`} role="status">
        {gymJoinStatusMessage(joinState, gymName)}
      </p>
      {valid ? <form action={action} className="mt-6">
        <input name="kind" type="hidden" value={kind} />
        <input name="reference" type="hidden" value={reference} />
        <p className="mb-5 text-sm leading-6 text-[var(--muted)]">This creates standard member access only. Staff permissions are managed separately by the gym.</p>
        <Button className="w-full sm:w-auto" disabled={pending} type="submit">{pending ? "Joining…" : "Join this gym"}</Button>
      </form> : null}
      {alreadyMember ? <a className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[var(--foreground)] px-5 text-sm font-bold text-[var(--surface)]" href={`/g/${gymSlug}/app`}>Go to gym dashboard</a> : null}
      {state.message ? <p className="mt-4 text-sm font-semibold text-red-700 outline-none" ref={message} role="alert" tabIndex={-1}>{state.message}</p> : null}
      {!valid && !alreadyMember ? <a className="mt-6 inline-flex min-h-11 items-center font-bold underline" href="/onboarding#join-gym">Try another gym code</a> : null}
    </section>
  );
}

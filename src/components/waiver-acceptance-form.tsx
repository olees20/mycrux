"use client";

import { useActionState } from "react";
import { acceptGuestWaiverAction, acceptMemberWaiverAction } from "@/features/waivers/actions";
import { initialWaiverState } from "@/features/waivers/state";
import type { WaiverRequirements } from "@/features/waivers/validation";

export function WaiverAcceptanceForm({ gymSlug, versionId, requirements, defaultName, guestToken }: { gymSlug?: string; versionId: string; requirements: WaiverRequirements; defaultName?: string; guestToken?: string }) {
  const action = guestToken ? acceptGuestWaiverAction : acceptMemberWaiverAction; const [state, formAction, pending] = useActionState(action, initialWaiverState);
  return <form action={formAction} className="mt-5 grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:grid-cols-2"><input name="gymSlug" type="hidden" value={gymSlug ?? ""} /><input name="token" type="hidden" value={guestToken ?? ""} /><input name="versionId" type="hidden" value={versionId} />
    <label className="text-sm font-bold sm:col-span-2">Full legal name<input autoComplete="name" className="mt-1 w-full rounded-[var(--radius-sm)] border p-3 font-normal" defaultValue={defaultName} maxLength={160} name="acceptedName" required /></label>
    {requirements.collect_date_of_birth ? <label className="text-sm font-bold">Date of birth<input autoComplete="bday" className="mt-1 w-full rounded-[var(--radius-sm)] border p-3 font-normal" name="dateOfBirth" required type="date" /></label> : <input name="dateOfBirth" type="hidden" value="" />}
    {requirements.collect_emergency_contact ? <><label className="text-sm font-bold">Emergency contact name<input className="mt-1 w-full rounded-[var(--radius-sm)] border p-3 font-normal" maxLength={160} name="emergencyContactName" required /></label><label className="text-sm font-bold">Emergency contact phone<input autoComplete="tel" className="mt-1 w-full rounded-[var(--radius-sm)] border p-3 font-normal" maxLength={40} name="emergencyContactPhone" required type="tel" /></label></> : <><input name="emergencyContactName" type="hidden" value="" /><input name="emergencyContactPhone" type="hidden" value="" /></>}
    {requirements.require_age_confirmation ? <label className="flex items-start gap-3 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-4 text-sm font-bold sm:col-span-2"><input className="mt-1 h-5 w-5" name="ageConfirmed" required type="checkbox" />I confirm I am at least {requirements.minimum_age}, or I am signing with the legally required parent/guardian authority.</label> : null}
    <fieldset className="space-y-3 sm:col-span-2"><legend className="font-black">Required consents</legend>{requirements.consent_items.map((item) => <label className="flex items-start gap-3 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-4 text-sm" key={item}><input className="mt-1 h-5 w-5" name="consents" required type="checkbox" value={item} /><span>{item}</span></label>)}</fieldset>
    <label className="text-sm font-bold sm:col-span-2">Typed signature<input className="mt-1 w-full rounded-[var(--radius-sm)] border p-3 font-serif text-lg font-normal" maxLength={160} name="signatureText" placeholder="Type your full name" required /></label>
    <button className="min-h-12 rounded-[var(--radius-md)] bg-[var(--primary)] px-5 font-bold text-white sm:col-span-2" disabled={pending}>{pending ? "Recording acceptance…" : "Sign and accept this exact version"}</button>{state.message ? <p aria-live="polite" className={`text-sm sm:col-span-2 ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p> : null}
  </form>;
}

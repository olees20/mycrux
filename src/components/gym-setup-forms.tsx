"use client";

import { Select } from "@/components/ui/form-controls";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { continueSetupAction, saveSetupClimbingAction, saveSetupDetailsAction, saveSetupLocationAction } from "@/features/gyms/setup-actions";
import { initialGymSetupActionState, type GymSetupActionState } from "@/features/gyms/setup-state";

const input = "mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 font-normal focus:outline-none focus:ring-2 focus:ring-[var(--foreground)] focus:ring-offset-2";
const disciplines = [["bouldering", "Bouldering"], ["sport", "Sport climbing"], ["trad", "Trad"], ["speed", "Speed"], ["training", "Training"]] as const;

function Result({ state }: { state: GymSetupActionState }) {
  const result = useRef<HTMLDivElement>(null);
  useEffect(() => { if (state.message) result.current?.focus(); }, [state.message]);
  return state.message ? <div aria-live="assertive" className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 outline-none" ref={result} role="alert" tabIndex={-1}>{state.message}</div> : null;
}

function ErrorText({ state, name }: { state: GymSetupActionState; name: string }) {
  const message = state.fieldErrors?.[name];
  return message ? <span className="mt-1 block text-xs font-semibold text-red-700">{message}</span> : null;
}

function Footer({ state, pending, label = "Save and continue" }: { state: GymSetupActionState; pending: boolean; label?: string }) {
  return <div className="space-y-4"><Result state={state} /><Button disabled={pending} type="submit">{pending ? "Saving…" : label}</Button></div>;
}

export function SetupDetailsForm({ gymSlug, values }: { gymSlug: string; values: { name: string; contactEmail: string; contactPhone: string; primaryColour: string; accentColour: string; backgroundColour: string } }) {
  const [state, action, pending] = useActionState(saveSetupDetailsAction, initialGymSetupActionState);
  return <form action={action} className="space-y-6"><input name="gymSlug" type="hidden" value={gymSlug} /><div className="grid gap-5 md:grid-cols-2"><label className="text-sm font-bold">Gym name<input aria-invalid={Boolean(state.fieldErrors?.name)} className={input} defaultValue={values.name} name="name" required /><ErrorText name="name" state={state} /></label><label className="text-sm font-bold">Contact email <span className="font-normal text-[var(--muted)]">(optional)</span><input aria-invalid={Boolean(state.fieldErrors?.contactEmail)} className={input} defaultValue={values.contactEmail} name="contactEmail" type="email" /><ErrorText name="contactEmail" state={state} /></label><label className="text-sm font-bold">Contact phone <span className="font-normal text-[var(--muted)]">(optional)</span><input className={input} defaultValue={values.contactPhone} name="contactPhone" /></label></div><fieldset><legend className="text-sm font-bold">Brand colours</legend><p className="mt-1 text-sm text-[var(--muted)]">Primary text must have at least 4.5:1 contrast against the background.</p><div className="mt-3 grid gap-4 sm:grid-cols-3"><label className="text-sm font-semibold">Primary<input className={`${input} p-1`} defaultValue={values.primaryColour} name="primaryColour" type="color" /><ErrorText name="primaryColour" state={state} /></label><label className="text-sm font-semibold">Accent<input className={`${input} p-1`} defaultValue={values.accentColour} name="accentColour" type="color" /></label><label className="text-sm font-semibold">Background<input className={`${input} p-1`} defaultValue={values.backgroundColour} name="backgroundColour" type="color" /></label></div></fieldset><Footer pending={pending} state={state} /></form>;
}

export function SetupLocationForm({ gymSlug, values }: { gymSlug: string; values: { addressLine1: string; addressLine2: string; city: string; postcode: string; countryCode: string; timezone: string } }) {
  const [state, action, pending] = useActionState(saveSetupLocationAction, initialGymSetupActionState);
  return <form action={action} className="space-y-6"><input name="gymSlug" type="hidden" value={gymSlug} /><div className="grid gap-5 md:grid-cols-2"><label className="text-sm font-bold md:col-span-2">Address line 1<input className={input} defaultValue={values.addressLine1} name="addressLine1" required /><ErrorText name="addressLine1" state={state} /></label><label className="text-sm font-bold">Address line 2 <span className="font-normal text-[var(--muted)]">(optional)</span><input className={input} defaultValue={values.addressLine2} name="addressLine2" /></label><label className="text-sm font-bold">Town or city<input className={input} defaultValue={values.city} name="city" required /><ErrorText name="city" state={state} /></label><label className="text-sm font-bold">Postcode<input className={input} defaultValue={values.postcode} name="postcode" required /></label><label className="text-sm font-bold">Country code<input className={input} defaultValue={values.countryCode} maxLength={2} name="countryCode" required /></label><label className="text-sm font-bold md:col-span-2">Timezone<input className={input} defaultValue={values.timezone} name="timezone" required /><span className="mt-1 block text-xs text-[var(--muted)]">Use an IANA timezone such as Europe/London.</span><ErrorText name="timezone" state={state} /></label></div><Footer pending={pending} state={state} /></form>;
}

export function SetupClimbingForm({ gymSlug, values }: { gymSlug: string; values: { disciplines: string[]; gradeSystems: string[]; defaultRouteType: string; defaultGrade: string } }) {
  const [state, action, pending] = useActionState(saveSetupClimbingAction, initialGymSetupActionState);
  return <form action={action} className="space-y-6"><input name="gymSlug" type="hidden" value={gymSlug} /><fieldset><legend className="text-sm font-bold">Disciplines offered</legend><div className="mt-3 flex flex-wrap gap-3">{disciplines.map(([value, label]) => <label className="flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold" key={value}><input defaultChecked={values.disciplines.includes(value)} name="disciplines" type="checkbox" value={value} />{label}</label>)}</div><ErrorText name="disciplines" state={state} /></fieldset><div className="grid gap-5 md:grid-cols-2"><label className="text-sm font-bold md:col-span-2">Grading systems<input className={input} defaultValue={values.gradeSystems.join(", ")} name="gradeSystems" placeholder="Font, V Scale" required /><span className="mt-1 block text-xs text-[var(--muted)]">Separate multiple systems with commas. The first becomes the default.</span><ErrorText name="gradeSystems" state={state} /></label><label className="text-sm font-bold">Default climb type<Select className={input} defaultValue={values.defaultRouteType} name="defaultRouteType"><option value="boulder">Boulder</option><option value="sport">Sport</option><option value="top_rope">Top rope</option><option value="trad">Trad</option><option value="training">Training</option></Select></label><label className="text-sm font-bold">Default grade<input className={input} defaultValue={values.defaultGrade} maxLength={20} name="defaultGrade" required /></label></div><Footer pending={pending} state={state} /></form>;
}

export function SetupContinueForm({ gymSlug, step, children, complete = false }: { gymSlug: string; step: 4 | 5 | 6; children?: React.ReactNode; complete?: boolean }) {
  const [state, action, pending] = useActionState(continueSetupAction, initialGymSetupActionState);
  return <form action={action} className="space-y-4"><input name="gymSlug" type="hidden" value={gymSlug} /><input name="step" type="hidden" value={step} />{children}<Footer label={complete ? "Complete setup" : "Save and continue"} pending={pending} state={state} /></form>;
}

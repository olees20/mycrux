"use client";

import { useActionState, useState } from "react";
import { rotateGymJoinCredentialsAction, setGymJoinEnabledAction } from "@/features/gym-access/actions";
import { initialMemberAccessActionState } from "@/features/gym-access/state";
import { Button } from "./ui/button";

function Result({ state }: { state: typeof initialMemberAccessActionState }) {
  return state.message ? <p aria-live="polite" className={`mt-3 text-sm font-semibold ${state.status === "error" ? "text-red-700" : "text-emerald-800"}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null;
}

export function CopyJoinUrl({ joinUrl }: { joinUrl: string }) {
  const [copied, setCopied] = useState(false);
  return <Button onClick={async () => { await navigator.clipboard.writeText(joinUrl); setCopied(true); }} type="button" variant="secondary">{copied ? "Copied" : "Copy join URL"}</Button>;
}

export function PrintMemberAccess() {
  return <Button onClick={() => window.print()} type="button" variant="secondary">Print member access</Button>;
}

export function MemberAccessSettings({ enabled, gymSlug }: { enabled: boolean; gymSlug: string }) {
  const [rotationState, rotationAction, rotating] = useActionState(rotateGymJoinCredentialsAction, initialMemberAccessActionState);
  const [enabledState, enabledAction, changing] = useActionState(setGymJoinEnabledAction, initialMemberAccessActionState);
  return <div className="space-y-5">
    <form action={enabledAction}>
      <input name="gymSlug" type="hidden" value={gymSlug} />
      <input name="enabled" type="hidden" value={enabled ? "false" : "true"} />
      <Button disabled={changing} type="submit" variant={enabled ? "secondary" : "primary"}>{changing ? "Saving…" : enabled ? "Disable member joining" : "Enable member joining"}</Button>
      <Result state={enabledState} />
    </form>
    <form action={rotationAction}>
      <input name="gymSlug" type="hidden" value={gymSlug} />
      <Button disabled={rotating} type="submit" variant="secondary">{rotating ? "Rotating…" : "Rotate QR and gym code"}</Button>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Rotation immediately invalidates every previously printed QR code, URL, and manual code.</p>
      <Result state={rotationState} />
    </form>
  </div>;
}

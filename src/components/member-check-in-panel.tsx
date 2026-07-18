"use client";

import { useActionState } from "react";
import { checkInMemberTokenAction, manualMemberCheckInAction, verifyMemberTokenAction } from "@/features/checkins/actions";
import { initialMemberCheckInState } from "@/features/checkins/state";

function Status({ message, status }: { message?: string; status?: string }) {
  return message ? <p aria-live="polite" className={`mt-3 text-sm ${status === "error" ? "text-red-700" : "text-emerald-700"}`}>{message}</p> : null;
}

export function MemberTokenVerifier({ gymSlug }: { gymSlug: string }) {
  const [verify, verifyAction, pending] = useActionState(verifyMemberTokenAction, initialMemberCheckInState);
  const [checkin, checkinAction, checking] = useActionState(checkInMemberTokenAction, initialMemberCheckInState);
  return <section className="rounded-2xl border border-[var(--border)] bg-white p-5"><h2 className="text-xl font-black">Scan member QR</h2>
    <form action={verifyAction} className="mt-4 flex flex-col gap-3 sm:flex-row"><input name="gymSlug" type="hidden" value={gymSlug}/><label className="flex-1 text-sm font-bold" htmlFor="member-reference">Scanned or pasted reference<input autoComplete="off" className="mt-1 min-h-11 w-full rounded-lg border p-3 font-mono text-sm font-normal" id="member-reference" name="reference" placeholder="CRUXMEM1.…" required/></label><button className="self-end rounded-full bg-black px-5 py-3 text-sm font-bold text-white" disabled={pending}>{pending ? "Checking…" : "Verify"}</button></form>
    <Status message={verify.message} status={verify.status}/>
    {verify.result?.found ? <div className="mt-4 rounded-xl bg-stone-50 p-4"><h3 className="text-xl font-black">{verify.result.memberName}</h3><p className="mt-2 text-sm">Membership: {verify.result.membershipStatus} ({verify.result.membershipSource} source)</p><p className="text-sm">Waivers: {verify.result.waiversComplete ? "complete" : "incomplete"} · Token: {verify.result.tokenStatus}</p><form action={checkinAction} className="mt-4"><input name="gymSlug" type="hidden" value={gymSlug}/><input name="reference" type="hidden" value={verify.reference}/><button className="min-h-11 rounded-full bg-emerald-700 px-5 text-sm font-bold text-white disabled:opacity-50" disabled={checking || verify.result.tokenStatus !== "valid" || !verify.result.waiversComplete}>{checking ? "Recording…" : "Check in member"}</button></form><Status message={checkin.message} status={checkin.status}/></div> : null}
  </section>;
}

export function ManualMemberCheckIn({ gymSlug, members }: { gymSlug: string; members: { membershipId: string; displayName: string }[] }) {
  const [state, action, pending] = useActionState(manualMemberCheckInAction, initialMemberCheckInState);
  return <section className="rounded-2xl border border-[var(--border)] bg-white p-5"><h2 className="text-xl font-black">Manual fallback</h2><p className="mt-2 text-sm text-[var(--muted)]">Use after confirming the member’s identity. The same waiver and active-membership checks still apply.</p>
    <form action={action} className="mt-4 flex flex-col gap-3 sm:flex-row"><input name="gymSlug" type="hidden" value={gymSlug}/><label className="flex-1 text-sm font-bold" htmlFor="manual-membership">Matching member<select className="mt-1 min-h-11 w-full rounded-lg border p-3 font-normal" id="manual-membership" name="membershipId" required><option value="">Select matching member</option>{members.map((member) => <option key={member.membershipId} value={member.membershipId}>{member.displayName}</option>)}</select></label><button className="self-end rounded-full bg-black px-5 py-3 text-sm font-bold text-white" disabled={pending}>{pending ? "Recording…" : "Manual check-in"}</button></form><Status message={state.message} status={state.status}/>
  </section>;
}

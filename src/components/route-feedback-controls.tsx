"use client";

import { useActionState } from "react";
import { submitRouteFeedbackAction, toggleRouteFavouriteAction } from "@/features/routes/feedback-actions";
import { initialRouteActionState } from "@/features/routes/state";

const options = [
  ["loved_it", "Loved it"], ["grade_soft", "Grade felt soft"], ["grade_right", "Grade felt right"], ["grade_hard", "Grade felt hard"],
  ["spinning_hold", "Spinning hold"], ["dirty_hold", "Dirty hold"],
] as const;

export function RouteFeedbackControls({ gymSlug, routeId, favourite, submitted }: { gymSlug: string; routeId: string; favourite: boolean; submitted: string[] }) {
  const [feedbackState, feedbackAction, feedbackPending] = useActionState(submitRouteFeedbackAction, initialRouteActionState);
  const [favouriteState, favouriteAction, favouritePending] = useActionState(toggleRouteFavouriteAction, initialRouteActionState);
  return <div className="space-y-5"><form action={favouriteAction}><input name="gymSlug" type="hidden" value={gymSlug} /><input name="routeId" type="hidden" value={routeId} /><button aria-pressed={favourite} className="min-h-11 rounded-full bg-black px-5 text-sm font-bold text-white" disabled={favouritePending}>{favouritePending ? "Updating…" : favourite ? "★ Favourited" : "☆ Add favourite"}</button>{favouriteState.message ? <p aria-live="polite" className={`mt-2 text-sm ${favouriteState.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{favouriteState.message}</p> : null}</form>
    <form action={feedbackAction} className="rounded-2xl border border-[var(--border)] bg-white p-5"><input name="gymSlug" type="hidden" value={gymSlug} /><input name="routeId" type="hidden" value={routeId} /><fieldset disabled={feedbackPending}><legend className="text-xl font-black">Private route feedback</legend><p className="mt-1 text-sm text-[var(--muted)]">Feedback is visible to authorised gym staff, not other members. Each option can be sent once.</p><div className="mt-4 flex flex-wrap gap-2">{options.map(([kind, label]) => <button className="min-h-11 rounded-full border px-4 text-sm font-bold disabled:bg-stone-100 disabled:text-stone-500" disabled={submitted.includes(kind)} key={kind} name="kind" value={kind}>{submitted.includes(kind) ? `✓ ${label}` : label}</button>)}</div><label className="mt-5 block text-sm font-bold">Other issue<textarea className="mt-1 min-h-24 w-full rounded-lg border p-3 font-normal" maxLength={1000} name="comment" placeholder="Describe what needs attention" /></label><button className="mt-3 min-h-11 rounded-full border border-red-700 px-4 text-sm font-bold text-red-700 disabled:opacity-50" disabled={submitted.includes("other_issue")} name="kind" value="other_issue">{submitted.includes("other_issue") ? "✓ Other issue sent" : "Report other issue"}</button></fieldset>{feedbackState.message ? <p aria-live="polite" className={`mt-3 text-sm ${feedbackState.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{feedbackState.message}</p> : null}</form>
  </div>;
}

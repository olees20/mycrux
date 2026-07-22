"use client";

import { useActionState } from "react";
import { cancelEventAction, registerEventAction } from "@/features/events/actions";
import { initialEventState } from "@/features/events/state";

export function EventBookingControls({ gymSlug, eventId, status }: { gymSlug: string; eventId: string; status: string | null }) {
  const [register, registerAction, registering] = useActionState(registerEventAction, initialEventState);
  const [cancel, cancelAction, cancelling] = useActionState(cancelEventAction, initialEventState);
  if (status === "registered" || status === "waitlisted") return <form action={cancelAction}>
    <input name="gymSlug" type="hidden" value={gymSlug}/><input name="eventId" type="hidden" value={eventId}/>
    <p className="mb-3 rounded-[var(--radius-md)] bg-emerald-50 p-4 text-sm font-bold">Your status: {status}</p>
    <button className="min-h-11 rounded-[var(--radius-md)] border border-red-700 px-5 text-sm font-bold text-red-700" disabled={cancelling}>{cancelling ? "Cancelling…" : "Cancel registration"}</button>
    {cancel.message ? <p aria-live="polite" className={`mt-2 text-sm ${cancel.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{cancel.message}</p> : null}
  </form>;
  return <form action={registerAction}>
    <input name="gymSlug" type="hidden" value={gymSlug}/><input name="eventId" type="hidden" value={eventId}/>
    <button className="min-h-11 rounded-[var(--radius-md)] bg-[var(--primary)] px-5 text-sm font-bold text-white" disabled={registering}>{registering ? "Booking…" : "Book or join waitlist"}</button>
    {register.message ? <p aria-live="polite" className={`mt-2 text-sm ${register.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{register.message}</p> : null}
  </form>;
}

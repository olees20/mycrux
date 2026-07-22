"use client";

import { useActionState } from "react";
import { saveWallAction } from "@/features/routes/actions";
import { initialRouteActionState } from "@/features/routes/state";

export function WallForm({ gymSlug, wall }: { gymSlug: string; wall?: { id: string; name: string; description: string | null; sort_order: number } }) {
  const [state, action, pending] = useActionState(saveWallAction, initialRouteActionState);
  return <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_7rem_auto]">
    <input name="gymSlug" type="hidden" value={gymSlug} /><input name="wallId" type="hidden" value={wall?.id ?? ""} />
    <label className="text-sm font-bold">Wall / sector name<input className="mt-1 w-full rounded-[var(--radius-sm)] border p-3 font-normal" defaultValue={wall?.name} maxLength={100} name="name" required /></label>
    <label className="text-sm font-bold">Description<input className="mt-1 w-full rounded-[var(--radius-sm)] border p-3 font-normal" defaultValue={wall?.description ?? ""} maxLength={1000} name="description" /></label>
    <label className="text-sm font-bold">Order<input className="mt-1 w-full rounded-[var(--radius-sm)] border p-3 font-normal" defaultValue={wall?.sort_order ?? 0} min={0} name="sortOrder" type="number" /></label>
    <button className="min-h-11 self-end rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 text-sm font-bold text-white" disabled={pending}>{pending ? "Saving…" : wall ? "Update" : "Add wall"}</button>
    {state.message ? <p className={`text-sm sm:col-span-4 ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p> : null}
  </form>;
}

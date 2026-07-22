"use client";

import { useActionState, useState } from "react";
import { uploadWallImageAction } from "@/features/routes/actions";
import { initialRouteActionState } from "@/features/routes/state";

export function WallImageForm({ gymSlug, wallId }: { gymSlug: string; wallId: string }) {
  const [state, action, pending] = useActionState(uploadWallImageAction, initialRouteActionState);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  return <form action={action} className="mt-4 grid gap-3 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-4 sm:grid-cols-2">
    <input name="gymSlug" type="hidden" value={gymSlug} /><input name="wallId" type="hidden" value={wallId} />
    <input name="width" type="hidden" value={dimensions.width} /><input name="height" type="hidden" value={dimensions.height} />
    <label className="text-sm font-bold sm:col-span-2">New current image<input accept="image/png,image/jpeg,image/webp" className="mt-1 block w-full text-sm" name="image" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const url = URL.createObjectURL(file); const image = new Image(); image.onload = () => { setDimensions({ width: image.naturalWidth, height: image.naturalHeight }); URL.revokeObjectURL(url); }; image.src = url; }} required type="file" /></label>
    <label className="text-sm font-bold sm:col-span-2">Accessible description<input className="mt-1 w-full rounded-[var(--radius-sm)] border p-3 font-normal" maxLength={500} name="altText" required /></label>
    <label className="text-sm font-bold">Photo date<input className="mt-1 w-full rounded-[var(--radius-sm)] border p-3 font-normal" name="capturedAt" type="date" /></label>
    <button className="min-h-11 self-end rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 text-sm font-bold text-white disabled:opacity-50" disabled={pending || dimensions.width === 0}>{pending ? "Uploading…" : "Upload wall image"}</button>
    {state.message ? <p className={`text-sm sm:col-span-2 ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p> : null}
  </form>;
}

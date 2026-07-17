"use client";

import { useActionState, useMemo, useState } from "react";
import Image from "next/image";
import { saveRouteAction, uploadRouteMediaAction } from "@/features/routes/actions";
import { initialRouteActionState } from "@/features/routes/state";

type Point = { x: number; y: number };
type Overlay = { kind: "point"; x: number; y: number } | { kind: "polygon"; points: Point[] } | null;
type WallOption = { id: string; name: string; imageId: string | null; imageUrl: string | null; imageAlt: string | null; imageWidth: number | null; imageHeight: number | null };
type RouteValue = { id: string; wall_id: string; wall_image_id: string | null; name: string | null; colour: string; grade_system: string; grade: string; route_type: "boulder" | "sport" | "top_rope" | "trad" | "training"; setter_id: string | null; set_on: string | null; retire_on: string | null; status: "draft" | "published" | "retired" | "archived"; description: string | null; overlay: unknown; tags: string[] };

function initialOverlay(value: unknown): Overlay {
  if (!value || typeof value !== "object" || !("kind" in value)) return null;
  return value as Overlay;
}

export function RouteForm({ gymSlug, walls, setters, route }: { gymSlug: string; walls: WallOption[]; setters: { id: string; label: string }[]; route?: RouteValue }) {
  const [state, action, pending] = useActionState(saveRouteAction, initialRouteActionState);
  const [mediaState, mediaAction, mediaPending] = useActionState(uploadRouteMediaAction, initialRouteActionState);
  const [wallId, setWallId] = useState(route?.wall_id ?? walls[0]?.id ?? "");
  const [mode, setMode] = useState<"point" | "polygon">((initialOverlay(route?.overlay)?.kind ?? "point") as "point" | "polygon");
  const [overlay, setOverlay] = useState<Overlay>(initialOverlay(route?.overlay));
  const wall = useMemo(() => walls.find((item) => item.id === wallId), [wallId, walls]);
  function place(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect(); const point = { x: Number(((event.clientX - rect.left) / rect.width).toFixed(4)), y: Number(((event.clientY - rect.top) / rect.height).toFixed(4)) };
    setOverlay((current) => mode === "point" ? { kind: "point", ...point } : { kind: "polygon", points: current?.kind === "polygon" ? [...current.points, point].slice(0, 100) : [point] });
  }
  const points = overlay?.kind === "point" ? [{ x: overlay.x, y: overlay.y }] : overlay?.points ?? [];
  return <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <input name="gymSlug" type="hidden" value={gymSlug} /><input name="routeId" type="hidden" value={route?.id ?? ""} /><input name="overlay" type="hidden" value={overlay && (overlay.kind === "point" || overlay.points.length >= 3) ? JSON.stringify(overlay) : ""} /><input name="wallImageId" type="hidden" value={wall?.imageId ?? ""} />
      <label className="text-sm font-bold">Wall<select className="mt-1 w-full rounded-lg border p-3 font-normal" name="wallId" onChange={(event) => { setWallId(event.target.value); setOverlay(null); }} value={wallId}>{walls.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-bold">Route name (optional)<input className="mt-1 w-full rounded-lg border p-3 font-normal" defaultValue={route?.name ?? ""} maxLength={120} name="name" /></label>
      <label className="text-sm font-bold">Colour<input className="mt-1 w-full rounded-lg border p-3 font-normal" defaultValue={route?.colour ?? "Blue"} maxLength={40} name="colour" required /></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm font-bold">Grade system<input className="mt-1 w-full rounded-lg border p-3 font-normal" defaultValue={route?.grade_system ?? "font"} maxLength={30} name="gradeSystem" required /></label><label className="text-sm font-bold">Grade<input className="mt-1 w-full rounded-lg border p-3 font-normal" defaultValue={route?.grade ?? "6A"} maxLength={20} name="grade" required /></label></div>
      <label className="text-sm font-bold">Discipline<select className="mt-1 w-full rounded-lg border p-3 font-normal" defaultValue={route?.route_type ?? "boulder"} name="discipline"><option value="boulder">Boulder</option><option value="sport">Sport</option><option value="top_rope">Top rope</option><option value="trad">Trad</option><option value="training">Training</option></select></label>
      <label className="text-sm font-bold">Setter<select className="mt-1 w-full rounded-lg border p-3 font-normal" defaultValue={route?.setter_id ?? ""} name="setterId"><option value="">Not recorded</option>{setters.map((setter) => <option key={setter.id} value={setter.id}>{setter.label}</option>)}</select></label>
      <label className="text-sm font-bold">Set date<input className="mt-1 w-full rounded-lg border p-3 font-normal" defaultValue={route?.set_on ?? ""} name="setOn" type="date" /></label>
      <label className="text-sm font-bold">Planned removal<input className="mt-1 w-full rounded-lg border p-3 font-normal" defaultValue={route?.retire_on ?? ""} name="retireOn" type="date" /></label>
      <label className="text-sm font-bold">Status<select className="mt-1 w-full rounded-lg border p-3 font-normal" defaultValue={route?.status ?? "draft"} name="status"><option value="draft">Draft</option><option value="published">Published</option><option value="retired">Retired</option><option value="archived">Archived</option></select></label>
      <label className="text-sm font-bold">Style tags<input className="mt-1 w-full rounded-lg border p-3 font-normal" defaultValue={route?.tags.join(", ") ?? ""} maxLength={500} name="tags" placeholder="technical, slab, crimpy" /></label>
      <label className="text-sm font-bold md:col-span-2">Description<textarea className="mt-1 min-h-24 w-full rounded-lg border p-3 font-normal" defaultValue={route?.description ?? ""} maxLength={2000} name="description" /></label>
      {wall?.imageUrl ? <fieldset className="md:col-span-2"><legend className="text-sm font-bold">Overlay on current wall image</legend><div className="my-2 flex gap-2"><button className={`rounded-full px-3 py-1 text-xs font-bold ${mode === "point" ? "bg-black text-white" : "bg-stone-100"}`} onClick={() => { setMode("point"); setOverlay(null); }} type="button">Point</button><button className={`rounded-full px-3 py-1 text-xs font-bold ${mode === "polygon" ? "bg-black text-white" : "bg-stone-100"}`} onClick={() => { setMode("polygon"); setOverlay(null); }} type="button">Polygon</button><button className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold" onClick={() => setOverlay(null)} type="button">Clear</button></div><div className="relative cursor-crosshair overflow-hidden rounded-xl bg-stone-100" onClick={place}><Image alt={wall.imageAlt ?? "Current wall"} className="h-auto w-full" height={wall.imageHeight ?? 800} src={wall.imageUrl} unoptimized width={wall.imageWidth ?? 1200} />{points.map((point, index) => <span className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-600 shadow" key={`${point.x}-${point.y}-${index}`} style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }} />)}{overlay?.kind === "polygon" && overlay.points.length < 3 ? <span className="absolute bottom-2 left-2 rounded bg-black/75 px-2 py-1 text-xs text-white">Add {3 - overlay.points.length} more point{overlay.points.length === 2 ? "" : "s"}</span> : null}</div></fieldset> : <p className="rounded-xl bg-amber-50 p-4 text-sm md:col-span-2">Upload a current wall image to place an overlay.</p>}
      <button className="min-h-11 rounded-lg bg-black px-4 text-sm font-bold text-white md:col-span-2" disabled={pending || !wallId}>{pending ? "Saving…" : route ? "Save route" : "Create route"}</button>
      {state.message ? <p className={`text-sm md:col-span-2 ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p> : null}
    </form>
    {route ? <form action={mediaAction} className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-2"><input name="gymSlug" type="hidden" value={gymSlug} /><input name="routeId" type="hidden" value={route.id} /><label className="text-sm font-bold">Optional route image<input accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full font-normal" name="image" required type="file" /></label><label className="text-sm font-bold">Image description<input className="mt-1 w-full rounded-lg border p-3 font-normal" maxLength={500} name="altText" /></label><button className="min-h-11 rounded-lg border px-4 text-sm font-bold" disabled={mediaPending}>{mediaPending ? "Uploading…" : "Add media"}</button>{mediaState.message ? <p className={`self-center text-sm ${mediaState.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{mediaState.message}</p> : null}</form> : null}
  </div>;
}

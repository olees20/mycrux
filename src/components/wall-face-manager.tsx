"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { saveWallFacesAction } from "@/features/floorplan/face-actions";
import { faceInclineLabel, moveFace, normalizeFaceOrder, serializeFace, type ClimbingFace } from "@/features/floorplan/faces";

const fieldClass = "mt-1 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2";
const buttonClass = "min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 disabled:opacity-40";

type Structure = { id: string; name: string; lengthMetres: number } | null;

export function WallFaceManager({ gymSlug, initialFaces, initialRevisions, persistedStructureIds, structure }: { gymSlug: string; initialFaces: ClimbingFace[]; initialRevisions: Record<string, number>; persistedStructureIds: Set<string>; structure: Structure }) {
  const grouped = useMemo(() => initialFaces.reduce<Record<string, ClimbingFace[]>>((result, face) => { (result[face.structureId] ??= []).push(face); return result; }, {}), [initialFaces]);
  const [facesByStructure, setFacesByStructure] = useState(grouped);
  const [revisions, setRevisions] = useState(initialRevisions);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [persistedFaceIds, setPersistedFaceIds] = useState(() => new Set(initialFaces.map(({ id }) => id)));
  const [messages, setMessages] = useState<Record<string, { status: "neutral" | "success" | "error"; text: string }>>({});
  const [saving, startSaving] = useTransition();
  const faces = structure ? facesByStructure[structure.id] ?? [] : [];
  const persisted = structure ? persistedStructureIds.has(structure.id) : false;
  const message = structure ? messages[structure.id] : undefined;

  function change(next: ClimbingFace[]) {
    if (!structure) return;
    setFacesByStructure((current) => ({ ...current, [structure.id]: normalizeFaceOrder(next) }));
    setDirty((current) => new Set(current).add(structure.id));
    setMessages((current) => ({ ...current, [structure.id]: { status: "neutral", text: "Unsaved face changes." } }));
  }

  function update(faceId: string, values: Partial<ClimbingFace>) { change(faces.map((face) => face.id === faceId ? { ...face, ...values } : face)); }

  function addFace() {
    if (!structure) return;
    change([...faces, { id: crypto.randomUUID(), structureId: structure.id, name: `Face ${faces.length + 1}`, widthMetres: Math.max(0.1, Math.min(200, Number(structure.lengthMetres.toFixed(3)))), heightMetres: 4, climbingAngleDegrees: 0, notes: "", sortOrder: faces.length, createdAt: new Date().toISOString(), routeCount: 0 }]);
  }

  function save() {
    if (!structure) return;
    startSaving(async () => {
      try {
        const result = await saveWallFacesAction({ gymSlug, structureId: structure.id, expectedRevision: revisions[structure.id] ?? 0, faces: faces.map(serializeFace) });
        setMessages((current) => ({ ...current, [structure.id]: { status: result.status === "success" ? "success" : "error", text: result.message } }));
        if (result.status === "success") { setRevisions((current) => ({ ...current, [structure.id]: result.revision })); setPersistedFaceIds((current) => new Set([...current, ...faces.map(({ id }) => id)])); setDirty((current) => { const next = new Set(current); next.delete(structure.id); return next; }); }
      } catch {
        setMessages((current) => ({ ...current, [structure.id]: { status: "error", text: "The climbing faces could not be saved. Check your connection and try again." } }));
      }
    });
  }

  return <section className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface)] p-5" aria-labelledby="faces-heading">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--muted)]">Phase 2</p><h2 className="mt-1 text-xl font-black" id="faces-heading">Climbing faces</h2></div>{structure ? <span className="rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-bold">{faces.length}</span> : null}</div>
    {!structure ? <p className="mt-3 text-sm text-[var(--muted)]">Select a wall structure to manage its climbing faces.</p> : !persisted ? <div className="mt-4 rounded-[var(--radius-md)] bg-amber-50 p-4 text-sm text-amber-950"><strong>Save the floorplan first.</strong><p className="mt-1">The wall structure must exist before faces can be attached.</p></div> : <>
      <div className="mt-4 flex items-center justify-between gap-3"><div><p className="font-black">{structure.name}</p><p className="text-xs text-[var(--muted)]">Structure length {structure.lengthMetres.toFixed(2)} m</p></div><button className={buttonClass} onClick={addFace} type="button">Add face</button></div>
      {faces.length ? <ol className="mt-4 space-y-4">{faces.map((face, index) => <li className="rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] p-4" key={face.id}><div className="flex items-center justify-between gap-2"><strong>Face {index + 1}</strong><div className="flex gap-1"><button aria-label={`Move ${face.name} up`} className={buttonClass} disabled={index === 0} onClick={() => change(moveFace(faces, face.id, -1))} type="button">↑</button><button aria-label={`Move ${face.name} down`} className={buttonClass} disabled={index === faces.length - 1} onClick={() => change(moveFace(faces, face.id, 1))} type="button">↓</button></div></div><div className="mt-3 grid grid-cols-2 gap-3"><label className="col-span-2 text-sm font-bold">Name<input className={fieldClass} maxLength={100} onChange={(event) => update(face.id, { name: event.target.value })} required value={face.name}/></label><label className="text-sm font-bold">Width (m)<input className={fieldClass} max="200" min="0.1" onChange={(event) => update(face.id, { widthMetres: Number(event.target.value) })} step="0.01" type="number" value={face.widthMetres}/></label><label className="text-sm font-bold">Height (m)<input className={fieldClass} max="100" min="0.1" onChange={(event) => update(face.id, { heightMetres: Number(event.target.value) })} step="0.01" type="number" value={face.heightMetres}/></label><label className="col-span-2 text-sm font-bold">Climbing angle (° from vertical)<input aria-describedby={`angle-${face.id}`} className={fieldClass} max="180" min="-90" onChange={(event) => update(face.id, { climbingAngleDegrees: Number(event.target.value) })} step="1" type="number" value={face.climbingAngleDegrees}/><span className="mt-1 block text-xs font-normal text-[var(--muted)]" id={`angle-${face.id}`}>{faceInclineLabel(face.climbingAngleDegrees)} · negative is slab, positive is overhang, 90° is roof</span></label><label className="col-span-2 text-sm font-bold">Notes (optional)<textarea className={`${fieldClass} min-h-20`} maxLength={1000} onChange={(event) => update(face.id, { notes: event.target.value })} value={face.notes}/></label></div><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-[var(--muted)]">Nominal area {(face.widthMetres * face.heightMetres).toFixed(1)} m²{face.routeCount ? ` · ${face.routeCount} linked route${face.routeCount === 1 ? "" : "s"}` : ""}</span><div className="flex flex-wrap gap-2">{persistedFaceIds.has(face.id) && !dirty.has(structure.id) ? <Link className="inline-flex min-h-10 items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2" href={`/g/${gymSlug}/staff/floorplan/faces/${face.id}`}>Open wall editor</Link> : <span className="inline-flex min-h-10 items-center px-2 text-xs font-bold text-[var(--muted)]">Save before opening</span>}<button className="min-h-10 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-800 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={face.routeCount > 0} onClick={() => change(faces.filter(({ id }) => id !== face.id))} title={face.routeCount ? "Faces with route history cannot be removed" : undefined} type="button">Remove face</button></div></div></li>)}</ol> : <p className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted)]">No climbing faces yet. Add the first face for this structure.</p>}
      <button className="mt-4 min-h-12 w-full rounded-[var(--radius-md)] bg-[var(--primary)] px-5 font-bold text-white focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 disabled:opacity-50" disabled={saving || !dirty.has(structure.id)} onClick={save} type="button">{saving ? "Saving faces…" : dirty.has(structure.id) ? "Save climbing faces" : "Faces saved"}</button>{message ? <p aria-live="polite" className={`mt-3 text-sm ${message.status === "error" ? "text-red-700" : message.status === "success" ? "text-emerald-700" : "text-[var(--muted)]"}`}>{message.text}</p> : null}
    </>}
  </section>;
}

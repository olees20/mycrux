"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { saveWallFacesAction } from "@/features/floorplan/face-actions";
import { faceInclineLabel, moveFace, normalizeFaceOrder, serializeFace, type ClimbingFace } from "@/features/floorplan/faces";
import { buildWorldSurface, presetSurfaceVertices, validateSurfacePolygon, type SurfaceKind, type WallProfile } from "@/features/digital-twin/geometry";

const fieldClass = "mt-1 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2";
const buttonClass = "min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 disabled:opacity-40";

type Structure = { id: string; name: string; lengthMetres: number } | null;

const profileAngles: Record<WallProfile, number> = { vertical: 0, slab: -10, overhang: 15, steep: 40, roof: 90, left_facet: 15, right_facet: 15, custom: 0 };
const surfaceKinds: { value: SurfaceKind; label: string }[] = [{value:"rectangle",label:"Rectangle"},{value:"triangle_left",label:"Left triangle"},{value:"triangle_right",label:"Right triangle"},{value:"quadrilateral",label:"Tapered quadrilateral"},{value:"custom",label:"Custom polygon"}];

function SurfacePreview({ face }: { face: ClimbingFace }) {
  const surface = buildWorldSurface({start:{x:0,y:0},end:{x:face.widthMetres,y:0}}, {widthMetres:face.widthMetres,heightMetres:face.heightMetres,angleDegrees:face.climbingAngleDegrees,surfaceKind:face.surfaceKind,facingDirection:face.facingDirection,localOffset:face.localOffset,vertices:face.vertices});
  const projected=surface.vertices.map(({x,y,z})=>({x:18+x*18+z*7,y:142-y*24-z*4}));
  const minX=Math.min(...projected.map(({x})=>x)),maxX=Math.max(...projected.map(({x})=>x)),minY=Math.min(...projected.map(({y})=>y)),maxY=Math.max(...projected.map(({y})=>y));
  const scale=Math.min(260/Math.max(1,maxX-minX),120/Math.max(1,maxY-minY));
  const points=projected.map(({x,y})=>`${20+(x-minX)*scale},${15+(y-minY)*scale}`).join(" ");
  return <figure className="mt-3 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[#f2f0eb] p-3"><figcaption className="mb-2 text-xs font-black uppercase tracking-[.14em] text-[var(--muted)]">Live 3D surface preview</figcaption><svg aria-label={`${face.name} ${face.surfaceKind.replaceAll("_"," ")} preview`} className="h-36 w-full" role="img" viewBox="0 0 300 160"><path d="M10 145H290" stroke="#a8a29e" strokeDasharray="4 4"/><polygon fill={face.materialColour} points={points} stroke="#292524" strokeLinejoin="round" strokeWidth="2"/>{projected.map(({x,y},index)=><circle cx={20+(x-minX)*scale} cy={15+(y-minY)*scale} fill="#65a30d" key={index} r="3" stroke="white"/>)}</svg></figure>;
}

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
    const widthMetres=Math.max(0.1, Math.min(200, Number(structure.lengthMetres.toFixed(3))));
    change([...faces, { id: crypto.randomUUID(), structureId: structure.id, name: `Face ${faces.length + 1}`, widthMetres, heightMetres: 4, climbingAngleDegrees: 0, notes: "", sortOrder: faces.length, createdAt: new Date().toISOString(), routeCount: 0, surfaceKind:"rectangle",profile:"vertical",facingDirection:1,localOffset:{x:0,y:0,z:0},materialColour:"#e7e5e4",vertices:[] }]);
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
      {faces.length ? <ol className="mt-4 space-y-4">{faces.map((face, index) => <li className="rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] p-4" key={face.id}><div className="flex items-center justify-between gap-2"><strong>Face {index + 1}</strong><div className="flex gap-1"><button aria-label={`Move ${face.name} up`} className={buttonClass} disabled={index === 0} onClick={() => change(moveFace(faces, face.id, -1))} type="button">↑</button><button aria-label={`Move ${face.name} down`} className={buttonClass} disabled={index === faces.length - 1} onClick={() => change(moveFace(faces, face.id, 1))} type="button">↓</button></div></div><div className="mt-3 grid grid-cols-2 gap-3"><label className="col-span-2 text-sm font-bold">Name<input className={fieldClass} maxLength={100} onChange={(event) => update(face.id, { name: event.target.value })} required value={face.name}/></label><label className="text-sm font-bold">Width (m)<input className={fieldClass} max="200" min="0.1" onChange={(event) => update(face.id, { widthMetres: Number(event.target.value) })} step="0.01" type="number" value={face.widthMetres}/></label><label className="text-sm font-bold">Height (m)<input className={fieldClass} max="100" min="0.1" onChange={(event) => update(face.id, { heightMetres: Number(event.target.value) })} step="0.01" type="number" value={face.heightMetres}/></label><label className="col-span-2 text-sm font-bold">Climbing angle (° from vertical)<input aria-describedby={`angle-${face.id}`} className={fieldClass} max="180" min="-90" onChange={(event) => update(face.id, { climbingAngleDegrees: Number(event.target.value), profile:"custom" })} step="1" type="number" value={face.climbingAngleDegrees}/><span className="mt-1 block text-xs font-normal text-[var(--muted)]" id={`angle-${face.id}`}>{faceInclineLabel(face.climbingAngleDegrees)} · negative is slab, positive is overhang, 90° is roof</span></label><label className="col-span-2 text-sm font-bold">Notes (optional)<textarea className={`${fieldClass} min-h-20`} maxLength={1000} onChange={(event) => update(face.id, { notes: event.target.value })} value={face.notes}/></label></div>
        <details className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4"><summary className="cursor-pointer font-black">3D surface and profile</summary><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-sm font-bold">Profile preset<select className={fieldClass} onChange={(event)=>{const profile=event.target.value as WallProfile;update(face.id,{profile,climbingAngleDegrees:profileAngles[profile],facingDirection:profile==="left_facet"?-1:profile==="right_facet"?1:face.facingDirection});}} value={face.profile}>{Object.keys(profileAngles).map((profile)=><option key={profile} value={profile}>{profile.replaceAll("_"," ")}</option>)}</select></label><label className="text-sm font-bold">Surface shape<select className={fieldClass} onChange={(event)=>{const surfaceKind=event.target.value as SurfaceKind;update(face.id,{surfaceKind,vertices:surfaceKind==="custom"?presetSurfaceVertices({widthMetres:face.widthMetres,heightMetres:face.heightMetres,angleDegrees:face.climbingAngleDegrees,surfaceKind}):[]});}} value={face.surfaceKind}>{surfaceKinds.map((kind)=><option key={kind.value} value={kind.value}>{kind.label}</option>)}</select></label><label className="text-sm font-bold">Facing<select className={fieldClass} onChange={(event)=>update(face.id,{facingDirection:Number(event.target.value) as -1|1})} value={face.facingDirection}><option value="1">Side A</option><option value="-1">Side B</option></select></label><label className="text-sm font-bold">Wall colour<input className={`${fieldClass} h-11 p-1`} onChange={(event)=>update(face.id,{materialColour:event.target.value})} type="color" value={face.materialColour}/></label>{([['x','Along wall'],['y','Base height'],['z','Depth']] as const).map(([axis,label])=><label className="text-sm font-bold" key={axis}>{label} offset (m)<input className={fieldClass} max={axis==='x'?200:100} min={axis==='x'?-200:-100} onChange={(event)=>update(face.id,{localOffset:{...face.localOffset,[axis]:Number(event.target.value)}})} step="0.05" type="number" value={face.localOffset[axis]}/></label>)}</div>
        {face.surfaceKind==="custom"?<fieldset className="mt-4"><legend className="font-black">Custom polygon vertices</legend><p className="mt-1 text-xs text-[var(--muted)]">Ordered face-local U/V coordinates in metres. Edges may not cross.</p><div className="mt-3 space-y-2">{face.vertices.map((vertex,vertexIndex)=><div className="grid grid-cols-[1.5rem_1fr_1fr_1fr_auto] items-end gap-2" key={vertexIndex}><span className="pb-3 text-xs font-black">{vertexIndex+1}</span>{(['u','v','depth'] as const).map((axis)=><label className="text-xs font-bold uppercase" key={axis}>{axis}<input className={fieldClass} onChange={(event)=>update(face.id,{vertices:face.vertices.map((item,itemIndex)=>itemIndex===vertexIndex?{...item,[axis]:Number(event.target.value)}:item)})} step="0.05" type="number" value={vertex[axis]}/></label>)}<button aria-label={`Remove vertex ${vertexIndex+1}`} className={buttonClass} disabled={face.vertices.length<=3} onClick={()=>update(face.id,{vertices:face.vertices.filter((_,itemIndex)=>itemIndex!==vertexIndex)})} type="button">×</button></div>)}</div><button className={`${buttonClass} mt-3`} disabled={face.vertices.length>=32} onClick={()=>update(face.id,{vertices:[...face.vertices,{u:face.widthMetres/2,v:face.heightMetres/2,depth:0}]})} type="button">Add vertex</button>{!validateSurfacePolygon(face.vertices).valid?<p className="mt-2 text-sm font-bold text-red-700" role="alert">{validateSurfacePolygon(face.vertices).reason}</p>:null}</fieldset>:null}<SurfacePreview face={face}/></details>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-[var(--muted)]">Nominal area {(face.widthMetres * face.heightMetres).toFixed(1)} m²{face.routeCount ? ` · ${face.routeCount} linked route${face.routeCount === 1 ? "" : "s"}` : ""}</span><div className="flex flex-wrap gap-2">{persistedFaceIds.has(face.id) && !dirty.has(structure.id) ? <Link className="inline-flex min-h-10 items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2" href={`/g/${gymSlug}/staff/floorplan/faces/${face.id}`}>Open wall editor</Link> : <span className="inline-flex min-h-10 items-center px-2 text-xs font-bold text-[var(--muted)]">Save before opening</span>}<button className="min-h-10 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-800 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={face.routeCount > 0} onClick={() => change(faces.filter(({ id }) => id !== face.id))} title={face.routeCount ? "Faces with route history cannot be removed" : undefined} type="button">Remove face</button></div></div></li>)}</ol> : <p className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted)]">No climbing faces yet. Add the first face for this structure.</p>}
      <button className="mt-4 min-h-12 w-full rounded-[var(--radius-md)] bg-[var(--primary)] px-5 font-bold text-white focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 disabled:opacity-50" disabled={saving || !dirty.has(structure.id)} onClick={save} type="button">{saving ? "Saving faces…" : dirty.has(structure.id) ? "Save climbing faces" : "Faces saved"}</button>{message ? <p aria-live="polite" className={`mt-3 text-sm ${message.status === "error" ? "text-red-700" : message.status === "success" ? "text-emerald-700" : "text-[var(--muted)]"}`}>{message.text}</p> : null}
    </>}
  </section>;
}

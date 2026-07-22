"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type PointerEvent as ReactPointerEvent } from "react";
import { WallFaceManager } from "@/components/wall-face-manager";
import { saveFloorplanAction } from "@/features/floorplan/actions";
import type { ClimbingFace } from "@/features/floorplan/faces";
import { clampPoint, resizeWall, rotateWall, serializeWall, snapPoint, wallAngleDegrees, wallLength, wallRectanglePoints, type FloorplanConfiguration, type FloorplanWall, type Point } from "@/features/floorplan/core";

type Tool = "select" | "draw" | "pan";
type Endpoint = "start" | "end";
type DragEndpoint = { wallId: string; endpoint: Endpoint; originalWalls: FloorplanWall[] };
type PanState = { client: Point; origin: Point };

const inputClass = "mt-1 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2";
const toolClass = "min-h-11 rounded-[var(--radius-md)] border px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 disabled:opacity-40";

function sameWalls(first: FloorplanWall[], second: FloorplanWall[]) {
  return JSON.stringify(first) === JSON.stringify(second);
}

export function FloorplanEditor({ configuration: initialConfiguration, floorplanId, gymSlug, initialFaces, initialFaceRevisions, initialRevision, initialWalls }: { configuration: FloorplanConfiguration; floorplanId: string; gymSlug: string; initialFaces: ClimbingFace[]; initialFaceRevisions: Record<string, number>; initialRevision: number; initialWalls: FloorplanWall[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const [walls, setWalls] = useState(initialWalls);
  const [past, setPast] = useState<FloorplanWall[][]>([]);
  const [future, setFuture] = useState<FloorplanWall[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialWalls[0]?.id ?? null);
  const [tool, setTool] = useState<Tool>("draw");
  const [draftStart, setDraftStart] = useState<Point | null>(null);
  const [preview, setPreview] = useState<Point | null>(null);
  const [dragEndpoint, setDragEndpoint] = useState<DragEndpoint | null>(null);
  const [panning, setPanning] = useState<PanState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [revision, setRevision] = useState(initialRevision);
  const [persistedStructureIds, setPersistedStructureIds] = useState(() => new Set(initialWalls.map(({ id }) => id)));
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("All changes are saved.");
  const [messageStatus, setMessageStatus] = useState<"neutral" | "success" | "error">("neutral");
  const [saving, startSaving] = useTransition();
  const selected = walls.find((wall) => wall.id === selectedId) ?? null;

  const viewBox = useMemo(() => ({ width: configuration.widthMetres / zoom, height: configuration.heightMetres / zoom, x: pan.x, y: pan.y }), [configuration.heightMetres, configuration.widthMetres, pan, zoom]);

  function worldPoint(event: { clientX: number; clientY: number }) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const transformed = point.matrixTransform(matrix.inverse());
    return clampPoint({ x: transformed.x, y: transformed.y }, configuration);
  }

  function snapped(event: { clientX: number; clientY: number }, excludedWallId?: string) {
    return snapPoint(worldPoint(event), walls, configuration, Math.max(0.08, 0.35 / zoom), excludedWallId);
  }

  function commit(next: FloorplanWall[]) {
    if (sameWalls(walls, next)) return;
    setPast((history) => [...history, walls].slice(-100));
    setWalls(next);
    setFuture([]);
    setDirty(true);
    setMessage("Unsaved changes.");
    setMessageStatus("neutral");
  }

  function undo() {
    const previous = past.at(-1); if (!previous) return;
    setPast((history) => history.slice(0, -1)); setFuture((history) => [walls, ...history].slice(0, 100)); setWalls(previous); setDirty(true); setDraftStart(null); setPreview(null);
    if (selectedId && !previous.some(({ id }) => id === selectedId)) setSelectedId(null);
  }

  function redo() {
    const next = future[0]; if (!next) return;
    setFuture((history) => history.slice(1)); setPast((history) => [...history, walls].slice(-100)); setWalls(next); setDirty(true);
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (tool === "pan" || event.button === 1 || event.altKey) {
      event.currentTarget.setPointerCapture(event.pointerId);
      setPanning({ client: { x: event.clientX, y: event.clientY }, origin: pan });
      return;
    }
    if (tool !== "draw") { setSelectedId(null); return; }
    const point = snapped(event);
    if (!draftStart) { setDraftStart(point); setPreview(point); return; }
    if (Math.hypot(point.x - draftStart.x, point.y - draftStart.y) < 0.05) {
      setMessage("Move at least 5 cm from the start point."); setMessageStatus("error"); return;
    }
    const wall: FloorplanWall = { id: crypto.randomUUID(), name: `Wall ${walls.length + 1}`, start: draftStart, end: point, thicknessMetres: 0.2, createdAt: new Date().toISOString() };
    commit([...walls, wall]); setSelectedId(wall.id); setDraftStart(null); setPreview(null); setTool("select");
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (panning) {
      const rect = event.currentTarget.getBoundingClientRect();
      setPan({ x: panning.origin.x - (event.clientX - panning.client.x) * viewBox.width / rect.width, y: panning.origin.y - (event.clientY - panning.client.y) * viewBox.height / rect.height });
      return;
    }
    if (dragEndpoint) {
      const point = snapped(event, dragEndpoint.wallId);
      setWalls((current) => current.map((wall) => {
        if (wall.id !== dragEndpoint.wallId) return wall;
        const opposite = dragEndpoint.endpoint === "start" ? wall.end : wall.start;
        return Math.hypot(point.x - opposite.x, point.y - opposite.y) >= 0.05 ? { ...wall, [dragEndpoint.endpoint]: point } : wall;
      }));
      setDirty(true); return;
    }
    if (tool === "draw" && draftStart) setPreview(snapped(event));
  }

  function endPointerInteraction(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setPanning(null);
    if (dragEndpoint) {
      if (!sameWalls(dragEndpoint.originalWalls, walls)) {
        setPast((history) => [...history, dragEndpoint.originalWalls].slice(-100)); setFuture([]);
      }
      setDragEndpoint(null);
    }
  }

  function beginEndpointDrag(event: ReactPointerEvent<SVGCircleElement>, wallId: string, endpoint: Endpoint) {
    event.stopPropagation(); setSelectedId(wallId); setTool("select");
    svgRef.current?.setPointerCapture(event.pointerId);
    setDragEndpoint({ wallId, endpoint, originalWalls: walls });
  }

  function updateSelected(changes: Partial<FloorplanWall>) {
    if (!selected) return;
    commit(walls.map((wall) => wall.id === selected.id ? { ...wall, ...changes } : wall));
  }

  function updatePoint(endpoint: Endpoint, axis: "x" | "y", value: number) {
    if (!selected || !Number.isFinite(value)) return;
    updateSelected({ [endpoint]: clampPoint({ ...selected[endpoint], [axis]: value }, configuration) });
  }

  function deleteSelected() {
    if (!selected) return;
    commit(walls.filter(({ id }) => id !== selected.id)); setSelectedId(null);
  }

  function save() {
    startSaving(async () => {
      try {
        const result = await saveFloorplanAction({ gymSlug, floorplanId, expectedRevision: revision, configuration, walls: walls.map(serializeWall) });
        setMessage(result.message); setMessageStatus(result.status === "success" ? "success" : "error");
        if (result.status === "success") { setRevision(result.revision); setDirty(false); setPast([]); setFuture([]); setPersistedStructureIds(new Set(walls.map(({ id }) => id))); }
      } catch {
        setMessage("The floorplan could not be saved. Check your connection and try again."); setMessageStatus("error");
      }
    });
  }

  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const editing = target?.matches("input, textarea, select, [contenteditable='true']");
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      else if (!editing && (event.key === "Delete" || event.key === "Backspace")) { event.preventDefault(); deleteSelected(); }
      else if (!editing && event.key === "Escape") { setDraftStart(null); setPreview(null); setSelectedId(null); }
    }
    window.addEventListener("keydown", keyboard); return () => window.removeEventListener("keydown", keyboard);
  });

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const draftWall = draftStart && preview ? { id: "draft", name: "New wall", start: draftStart, end: preview, thicknessMetres: 0.2, createdAt: "" } : null;
  const coordinateLabel = preview ? `${preview.x.toFixed(2)}, ${preview.y.toFixed(2)} m` : "Move across the canvas to inspect coordinates";

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
    <section className="min-w-0 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface)] shadow-sm" aria-labelledby="canvas-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-3">
        <div className="flex flex-wrap gap-2" aria-label="Floorplan tools">
          {(["select", "draw", "pan"] as Tool[]).map((item) => <button aria-pressed={tool === item} className={`${toolClass} ${tool === item ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "bg-[var(--surface)]"}`} key={item} onClick={() => { setTool(item); setDraftStart(null); setPreview(null); }} type="button">{item === "select" ? "Select" : item === "draw" ? "Draw wall" : "Pan"}</button>)}
          <button className={toolClass} disabled={!past.length} onClick={undo} type="button">Undo</button><button className={toolClass} disabled={!future.length} onClick={redo} type="button">Redo</button>
        </div>
        <div className="flex items-center gap-2"><button aria-label="Zoom out" className={toolClass} disabled={zoom <= 0.5} onClick={() => setZoom((value) => Math.max(0.5, value / 1.25))} type="button">−</button><output className="min-w-14 text-center text-sm font-bold">{Math.round(zoom * 100)}%</output><button aria-label="Zoom in" className={toolClass} disabled={zoom >= 4} onClick={() => setZoom((value) => Math.min(4, value * 1.25))} type="button">+</button><button className={toolClass} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} type="button">Fit</button></div>
      </div>
      <h2 className="sr-only" id="canvas-heading">Interactive floorplan canvas</h2>
      <div className="relative h-[60vh] min-h-[28rem] bg-[var(--surface-subtle)]">
        <svg aria-describedby="canvas-help" aria-label={`Floorplan with ${walls.length} wall structures. ${tool} tool active.`} className={`h-full w-full touch-none select-none ${tool === "pan" ? "cursor-grab" : tool === "draw" ? "cursor-crosshair" : "cursor-default"}`} onPointerCancel={endPointerInteraction} onPointerDown={handleCanvasPointerDown} onPointerMove={handlePointerMove} onPointerUp={endPointerInteraction} preserveAspectRatio="xMidYMid meet" ref={svgRef} role="application" viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}>
          <defs><pattern height={configuration.gridSizeMetres} id="floor-grid" patternUnits="userSpaceOnUse" width={configuration.gridSizeMetres}><path d={`M ${configuration.gridSizeMetres} 0 L 0 0 0 ${configuration.gridSizeMetres}`} fill="none" stroke="currentColor" strokeOpacity=".16" strokeWidth={0.025 / zoom}/></pattern></defs>
          <rect fill="white" height={configuration.heightMetres} stroke="currentColor" strokeWidth={0.05 / zoom} width={configuration.widthMetres} x="0" y="0"/>
          {configuration.showGrid ? <rect fill="url(#floor-grid)" height={configuration.heightMetres} pointerEvents="none" width={configuration.widthMetres}/> : null}
          {walls.map((wall) => { const points = wallRectanglePoints(wall).map(({ x, y }) => `${x},${y}`).join(" "); const active = wall.id === selectedId; const midpoint = { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 }; return <g key={wall.id} onPointerDown={(event) => { event.stopPropagation(); setSelectedId(wall.id); setTool("select"); }} role="button" tabIndex={0} aria-label={`${wall.name}, ${wallLength(wall).toFixed(2)} metres`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(wall.id); setTool("select"); } }}><polygon fill={active ? "#65a30d" : "#1c1917"} points={points} stroke={active ? "#365314" : "#0c0a09"} strokeWidth={active ? 0.07 / zoom : 0.03 / zoom}/><text fill={active ? "#365314" : "#44403c"} fontSize={Math.max(0.45, 0.65 / zoom)} fontWeight="700" pointerEvents="none" textAnchor="middle" x={midpoint.x} y={midpoint.y - wall.thicknessMetres - 0.2 / zoom}>{wall.name}</text>{active ? <><circle aria-label={`Move start of ${wall.name}`} cx={wall.start.x} cy={wall.start.y} fill="white" onPointerDown={(event) => beginEndpointDrag(event, wall.id, "start")} r={0.22 / zoom} stroke="#365314" strokeWidth={0.08 / zoom}/><circle aria-label={`Move end of ${wall.name}`} cx={wall.end.x} cy={wall.end.y} fill="white" onPointerDown={(event) => beginEndpointDrag(event, wall.id, "end")} r={0.22 / zoom} stroke="#365314" strokeWidth={0.08 / zoom}/></> : null}</g>; })}
          {draftWall ? <g pointerEvents="none"><polygon fill="#84cc16" fillOpacity=".7" points={wallRectanglePoints(draftWall).map(({ x, y }) => `${x},${y}`).join(" ")}/><text fill="#365314" fontSize={Math.max(0.5, 0.7 / zoom)} fontWeight="800" textAnchor="middle" x={(draftWall.start.x + draftWall.end.x) / 2} y={(draftWall.start.y + draftWall.end.y) / 2 - 0.35 / zoom}>{wallLength(draftWall).toFixed(2)} m</text><circle cx={draftWall.start.x} cy={draftWall.start.y} fill="#365314" r={0.14 / zoom}/></g> : null}
        </svg>
        {!walls.length && !draftStart ? <div className="pointer-events-none absolute inset-0 grid place-items-center p-8 text-center"><div className="max-w-sm rounded-[var(--radius-lg)] bg-[var(--surface)]/90 p-6 shadow-sm"><p className="text-xl font-black">Start with your first wall</p><p className="mt-2 text-sm text-[var(--muted)]">Choose Draw wall, click its start point, then click its end point.</p></div></div> : null}
        <p className="absolute bottom-3 left-3 rounded-[var(--radius-sm)] bg-[var(--surface)]/90 px-3 py-2 text-xs font-bold shadow-sm" aria-live="polite">{draftWall ? `Drawing ${wallLength(draftWall).toFixed(2)} m` : coordinateLabel}</p>
      </div>
      <p className="border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted)]" id="canvas-help">Draw with two clicks. Endpoints snap before the grid. Select a wall to drag its handles, or use the precise controls. Hold Alt or choose Pan to move the canvas.</p>
    </section>

    <aside className="space-y-5">
      <section className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--muted)]">Revision {revision}</p><h2 className="mt-1 text-xl font-black">Floorplan</h2></div><span className={`h-3 w-3 rounded-full ${dirty ? "bg-amber-500" : "bg-emerald-600"}`} aria-hidden="true"/></div><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-sm font-bold">Width (m)<input className={inputClass} min="5" max="1000" onChange={(event) => { setConfiguration((value) => ({ ...value, widthMetres: Number(event.target.value) })); setDirty(true); }} type="number" value={configuration.widthMetres}/></label><label className="text-sm font-bold">Height (m)<input className={inputClass} min="5" max="1000" onChange={(event) => { setConfiguration((value) => ({ ...value, heightMetres: Number(event.target.value) })); setDirty(true); }} type="number" value={configuration.heightMetres}/></label><label className="col-span-2 text-sm font-bold">Grid spacing (m)<input className={inputClass} max="10" min="0.1" onChange={(event) => { setConfiguration((value) => ({ ...value, gridSizeMetres: Number(event.target.value) })); setDirty(true); }} step="0.1" type="number" value={configuration.gridSizeMetres}/></label></div><div className="mt-4 space-y-3"><label className="flex items-center gap-3 text-sm font-bold"><input checked={configuration.showGrid} onChange={(event) => { setConfiguration((value) => ({ ...value, showGrid: event.target.checked })); setDirty(true); }} type="checkbox"/>Show grid</label><label className="flex items-center gap-3 text-sm font-bold"><input checked={configuration.snapToGrid} onChange={(event) => { setConfiguration((value) => ({ ...value, snapToGrid: event.target.checked })); setDirty(true); }} type="checkbox"/>Snap to grid</label></div><button className="mt-5 min-h-12 w-full rounded-[var(--radius-md)] bg-[var(--primary)] px-5 font-bold text-white focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 disabled:opacity-50" disabled={saving || !dirty} onClick={save} type="button">{saving ? "Saving…" : dirty ? "Save floorplan" : "Saved"}</button><p aria-live="polite" className={`mt-3 text-sm ${messageStatus === "error" ? "text-red-700" : messageStatus === "success" ? "text-emerald-700" : "text-[var(--muted)]"}`}>{message}</p></section>

      <section className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className="text-xl font-black">Selected wall</h2>{selected ? <div className="mt-4 space-y-4" key={selected.id}><label className="text-sm font-bold">Name<input className={inputClass} maxLength={100} onChange={(event) => updateSelected({ name: event.target.value })} value={selected.name}/></label><div className="grid grid-cols-2 gap-3"><label className="text-sm font-bold">Length (m)<input className={inputClass} max="1000" min="0.05" onChange={(event) => updateSelected(resizeWall(selected, Number(event.target.value)))} step="0.01" type="number" value={Number(wallLength(selected).toFixed(3))}/></label><label className="text-sm font-bold">Angle (°)<input className={inputClass} max="360" min="0" onChange={(event) => updateSelected(rotateWall(selected, Number(event.target.value)))} step="1" type="number" value={wallAngleDegrees(selected)}/></label><label className="text-sm font-bold">Thickness (m)<input className={inputClass} max="2" min="0.05" onChange={(event) => updateSelected({ thicknessMetres: Number(event.target.value) })} step="0.05" type="number" value={selected.thicknessMetres}/></label><div className="flex items-end gap-2"><button className={toolClass} onClick={() => updateSelected(rotateWall(selected, wallAngleDegrees(selected) - 5))} type="button">−5°</button><button className={toolClass} onClick={() => updateSelected(rotateWall(selected, wallAngleDegrees(selected) + 5))} type="button">+5°</button></div></div><fieldset><legend className="text-sm font-black">Endpoints (metres)</legend><div className="mt-2 grid grid-cols-2 gap-3">{(["start", "end"] as Endpoint[]).flatMap((endpoint) => (["x", "y"] as const).map((axis) => <label className="text-xs font-bold capitalize" key={`${endpoint}-${axis}`}>{endpoint} {axis.toUpperCase()}<input className={inputClass} max={axis === "x" ? configuration.widthMetres : configuration.heightMetres} min="0" onChange={(event) => updatePoint(endpoint, axis, Number(event.target.value))} step="0.01" type="number" value={selected[endpoint][axis]}/></label>))}</div></fieldset><p className="text-xs text-[var(--muted)]">Created {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(selected.createdAt))}</p><button className="min-h-11 w-full rounded-[var(--radius-md)] border border-red-300 bg-red-50 px-4 text-sm font-bold text-red-800 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2" onClick={deleteSelected} type="button">Delete wall</button></div> : <p className="mt-3 text-sm text-[var(--muted)]">Select a wall on the map or from the list below to edit it.</p>}</section>

      <WallFaceManager gymSlug={gymSlug} initialFaces={initialFaces} initialRevisions={initialFaceRevisions} persistedStructureIds={persistedStructureIds} structure={selected ? { id: selected.id, name: selected.name, lengthMetres: wallLength(selected) } : null}/>

      <section className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Walls</h2><span className="text-sm font-bold text-[var(--muted)]">{walls.length}</span></div>{walls.length ? <ol className="mt-3 max-h-72 space-y-2 overflow-auto">{walls.map((wall) => <li key={wall.id}><button aria-current={selectedId === wall.id ? "true" : undefined} className={`flex min-h-12 w-full items-center justify-between rounded-[var(--radius-md)] px-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] ${selectedId === wall.id ? "bg-lime-100" : "bg-[var(--surface-subtle)]"}`} onClick={() => { setSelectedId(wall.id); setTool("select"); }} type="button"><strong className="truncate">{wall.name}</strong><span className="ml-2 tabular-nums text-[var(--muted)]">{wallLength(wall).toFixed(2)} m</span></button></li>)}</ol> : <p className="mt-3 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted)]">No walls yet. The blank canvas is ready.</p>}</section>
    </aside>
  </div>;
}

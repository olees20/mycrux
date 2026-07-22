"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState, useTransition, type PointerEvent as ReactPointerEvent, type WheelEvent } from "react";
import { AscentForm } from "@/components/ascent-form";
import { HoldGlyph } from "@/components/hold-icon";
import { RouteFeedbackControls } from "@/components/route-feedback-controls";
import { wallLength, wallRectanglePoints } from "@/features/floorplan/core";
import { loadMemberFaceAction } from "@/features/floorplan/member-map-actions";
import type { MemberFaceDetail, MemberMapConfiguration, MemberMapRoute, MemberMapStructure } from "@/features/floorplan/member-map";
import type { GymRole } from "@/lib/supabase/types";

type Viewport = { x: number; y: number; width: number; height: number };
type DragState = { pointerId: number; clientX: number; clientY: number; viewport: Viewport };
type PinchState = { distance: number; midpoint: { x: number; y: number }; viewport: Viewport; bounds: DOMRect };

const minimumViewportMetres = 8;

function routeColour(colour: string) {
  const value = colour.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  const named: Record<string, string> = { black: "#292524", white: "#f5f5f4", grey: "#78716c", gray: "#78716c", red: "#dc2626", orange: "#ea580c", yellow: "#eab308", green: "#16a34a", blue: "#2563eb", purple: "#9333ea", pink: "#db2777" };
  return named[value.toLowerCase()] ?? "#65a30d";
}

function holdSize(category: string, scale: number) {
  const base = category === "volume" ? 1.35 : category === "macro" ? 0.9 : category === "foothold" ? 0.32 : 0.5;
  return Math.max(0.18, base * scale);
}

function formatDate(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00Z`));
}

function MapControls({ onFit, onZoom }: { onFit: () => void; onZoom: (factor: number) => void }) {
  return <div aria-label="Map controls" className="absolute right-3 top-3 z-10 flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] shadow-lg">
    <button aria-label="Zoom in" className="grid size-11 place-items-center border-b text-xl font-black hover:bg-[var(--surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-lime-700" onClick={() => onZoom(0.78)} type="button">+</button>
    <button aria-label="Zoom out" className="grid size-11 place-items-center border-b text-xl font-black hover:bg-[var(--surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-lime-700" onClick={() => onZoom(1.28)} type="button">−</button>
    <button className="min-h-11 px-3 text-xs font-black hover:bg-[var(--surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-lime-700" onClick={onFit} type="button">Fit</button>
  </div>;
}

function FloorplanMap({ configuration, structures, selectedId, onSelect }: { configuration: MemberMapConfiguration; structures: MemberMapStructure[]; selectedId: string | null; onSelect: (structure: MemberMapStructure) => void }) {
  const initial = useMemo<Viewport>(() => ({ x: 0, y: 0, width: configuration.widthMetres, height: configuration.heightMetres }), [configuration]);
  const [viewport, setViewport] = useState(initial);
  const drag = useRef<DragState | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<PinchState | null>(null);
  const fit = useCallback(() => setViewport(initial), [initial]);
  const zoom = useCallback((factor: number, centre?: { x: number; y: number }) => {
    setViewport((current) => {
      const width = Math.min(configuration.widthMetres * 2, Math.max(minimumViewportMetres, current.width * factor));
      const height = width * current.height / current.width;
      const focus = centre ?? { x: current.x + current.width / 2, y: current.y + current.height / 2 };
      const ratioX = (focus.x - current.x) / current.width;
      const ratioY = (focus.y - current.y) / current.height;
      return { x: focus.x - width * ratioX, y: focus.y - height * ratioY, width, height };
    });
  }, [configuration.widthMetres]);
  const onWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const focus = { x: viewport.x + (event.clientX - bounds.left) / bounds.width * viewport.width, y: viewport.y + (event.clientY - bounds.top) / bounds.height * viewport.height };
    zoom(event.deltaY < 0 ? 0.86 : 1.16, focus);
  };
  const beginPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) drag.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, viewport };
    if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(second.x - first.x, second.y - first.y), midpoint: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }, viewport, bounds: event.currentTarget.getBoundingClientRect() };
      drag.current = null;
    }
  };
  const pan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      const [first, second] = [...pointers.current.values()];
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
      const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
      const start = pinch.current;
      const width = Math.min(configuration.widthMetres * 2, Math.max(minimumViewportMetres, start.viewport.width * start.distance / distance));
      const height = width * start.viewport.height / start.viewport.width;
      const focus = { x: start.viewport.x + (start.midpoint.x - start.bounds.left) / start.bounds.width * start.viewport.width, y: start.viewport.y + (start.midpoint.y - start.bounds.top) / start.bounds.height * start.viewport.height };
      setViewport({ x: focus.x - (midpoint.x - start.bounds.left) / start.bounds.width * width, y: focus.y - (midpoint.y - start.bounds.top) / start.bounds.height * height, width, height });
      return;
    }
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - drag.current.clientX) / bounds.width * drag.current.viewport.width;
    const dy = (event.clientY - drag.current.clientY) / bounds.height * drag.current.viewport.height;
    setViewport({ ...drag.current.viewport, x: drag.current.viewport.x - dx, y: drag.current.viewport.y - dy });
  };
  const finishPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 1) {
      const [pointerId, position] = [...pointers.current.entries()][0];
      drag.current = { pointerId, clientX: position.x, clientY: position.y, viewport };
    }
  };

  return <div className="relative min-h-[32rem] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border)] bg-[#f4f1e8] shadow-inner lg:min-h-[calc(100vh-11rem)]">
    <MapControls onFit={fit} onZoom={zoom}/>
    <p className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-[var(--surface)]/90 px-3 py-2 text-xs font-bold text-stone-700 shadow">Drag to move · scroll or pinch to zoom</p>
    <svg aria-label="Interactive gym floorplan. Select a wall to explore its routes." className="absolute inset-0 size-full cursor-grab touch-none active:cursor-grabbing" onPointerCancel={finishPan} onPointerDown={beginPan} onPointerMove={pan} onPointerUp={finishPan} onWheel={onWheel} role="application" viewBox={`${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`}>
      <defs>{configuration.showGrid ? <pattern height={configuration.gridSizeMetres} id="member-map-grid" patternUnits="userSpaceOnUse" width={configuration.gridSizeMetres}><path d={`M ${configuration.gridSizeMetres} 0 L 0 0 0 ${configuration.gridSizeMetres}`} fill="none" stroke="#a8a29e" strokeOpacity=".32" strokeWidth={0.025}/></pattern> : null}</defs>
      <rect fill={configuration.showGrid ? "url(#member-map-grid)" : "#f4f1e8"} height={configuration.heightMetres} width={configuration.widthMetres} x="0" y="0"/>
      {structures.map((structure) => {
        const selected = structure.id === selectedId;
        const midpoint = { x: (structure.start.x + structure.end.x) / 2, y: (structure.start.y + structure.end.y) / 2 };
        const points = wallRectanglePoints(structure).map(({ x, y }) => `${x},${y}`).join(" ");
        return <g aria-label={`${structure.name}, ${wallLength(structure).toFixed(1)} metres. ${structure.faces.length} climbing ${structure.faces.length === 1 ? "face" : "faces"}.`} className="group cursor-pointer outline-none" key={structure.id} onClick={(event) => { event.stopPropagation(); onSelect(structure); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(structure); } }} onPointerDown={(event) => event.stopPropagation()} role="button" tabIndex={0}>
          <line stroke="transparent" strokeWidth={Math.max(1.6, structure.thicknessMetres + 1)} x1={structure.start.x} x2={structure.end.x} y1={structure.start.y} y2={structure.end.y}/>
          <polygon className="group-focus-visible:stroke-blue-700" fill={selected ? "#65a30d" : "#292524"} points={points} stroke={selected ? "#365314" : "#0c0a09"} strokeWidth={selected ? 0.16 : 0.12}/>
          {selected ? <polygon fill="none" points={points} stroke="#ffffff" strokeDasharray=".3 .2" strokeWidth=".08"/> : null}
          <text fill={selected ? "#365314" : "#44403c"} fontSize={Math.max(0.55, viewport.width / 80)} fontWeight="800" paintOrder="stroke" pointerEvents="none" stroke="#f4f1e8" strokeWidth=".18" textAnchor="middle" x={midpoint.x} y={midpoint.y - structure.thicknessMetres - 0.35}>{structure.name}</text>
        </g>;
      })}
    </svg>
  </div>;
}

function WallRoutePreview({ detail, selectedRoute }: { detail: Extract<MemberFaceDetail, { status: "success" }>; selectedRoute: MemberMapRoute | null }) {
  const selectedHolds = useMemo(() => new Set(selectedRoute?.holdIds ?? []), [selectedRoute]);
  const routeHoldIds = useMemo(() => new Set(detail.routes.flatMap((route) => route.holdIds)), [detail.routes]);
  return <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-subtle)]">
    <svg aria-label={selectedRoute ? `${selectedRoute.name} holds highlighted on ${detail.face.name}` : `${detail.face.name} climbing wall`} className="aspect-[4/3] w-full" preserveAspectRatio="xMidYMid meet" role="img" viewBox={`-0.35 -0.35 ${detail.face.widthMetres + 0.7} ${detail.face.heightMetres + 0.7}`}>
      <rect fill="#e7e5e4" height={detail.face.heightMetres} rx=".08" stroke="#a8a29e" strokeWidth=".05" width={detail.face.widthMetres}/>
      {detail.holds.filter((hold) => routeHoldIds.has(hold.id)).map((hold) => {
        const highlighted = selectedHolds.has(hold.id);
        const size = holdSize(hold.category, hold.scaleFactor) * (highlighted ? 1.18 : 1);
        return <g aria-label={highlighted ? `${hold.category} hold on selected route` : undefined} color={highlighted ? routeColour(selectedRoute?.colour ?? hold.colour) : "#78716c"} key={hold.id} opacity={selectedRoute && !highlighted ? 0.16 : 0.72} role={highlighted ? "img" : undefined} transform={`translate(${hold.position.x} ${detail.face.heightMetres - hold.position.y}) rotate(${-hold.rotationDegrees}) scale(${size})`}>
          {highlighted ? <circle fill="white" r=".78" stroke={routeColour(selectedRoute?.colour ?? hold.colour)} strokeWidth=".13" vectorEffect="non-scaling-stroke"/> : null}<HoldGlyph category={hold.iconKey}/>
        </g>;
      })}
    </svg>
  </div>;
}

function RouteMetadata({ route }: { route: MemberMapRoute }) {
  return <div className="rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] p-4"><div className="flex items-start gap-3"><span aria-hidden="true" className="mt-1 size-5 shrink-0 rounded-full border-2 border-white shadow" style={{ backgroundColor: routeColour(route.colour) }}/><div><h3 className="text-2xl font-black">{route.name}</h3><p className="font-bold text-stone-700">{route.grade} {route.gradeSystem} · {route.discipline.replaceAll("_", " ")}</p></div></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="font-bold text-[var(--muted)]">Setter</dt><dd>{route.setterName}</dd></div><div><dt className="font-bold text-[var(--muted)]">Set on</dt><dd>{formatDate(route.setOn)}</dd></div>{route.retireOn ? <div><dt className="font-bold text-[var(--muted)]">Planned removal</dt><dd>{formatDate(route.retireOn)}</dd></div> : null}<div><dt className="font-bold text-[var(--muted)]">Holds</dt><dd>{route.holdIds.length}</dd></div></dl>{route.description ? <p className="mt-4 text-sm leading-6">{route.description}</p> : null}{route.tags.length ? <ul aria-label="Route tags" className="mt-4 flex flex-wrap gap-2">{route.tags.map((tag) => <li className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-bold" key={tag}>{tag}</li>)}</ul> : null}</div>;
}

export function MemberGymMap({ gymSlug, gymName, role, configuration, structures }: { gymSlug: string; gymName: string; role: GymRole; configuration: MemberMapConfiguration; structures: MemberMapStructure[] }) {
  const [selectedStructure, setSelectedStructure] = useState<MemberMapStructure | null>(null);
  const [selectedFaceId, setSelectedFaceId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MemberFaceDetail | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const requestSequence = useRef(0);
  const selectedRoute = detail?.status === "success" ? detail.routes.find(({ id }) => id === selectedRouteId) ?? null : null;
  const isStaff = role !== "member";

  const selectFace = useCallback((faceId: string) => {
    const sequence = ++requestSequence.current;
    setSelectedFaceId(faceId); setSelectedRouteId(null); setDetail(null);
    startTransition(async () => {
      try {
        const result = await loadMemberFaceAction({ gymSlug, faceId });
        if (requestSequence.current === sequence) setDetail(result);
      } catch {
        if (requestSequence.current === sequence) setDetail({ status: "error", message: "This wall could not be loaded. Try again." });
      }
    });
  }, [gymSlug]);
  const selectStructure = useCallback((structure: MemberMapStructure) => {
    setSelectedStructure(structure); setDetail(null); setSelectedRouteId(null);
    if (structure.faces[0]) selectFace(structure.faces[0].id); else setSelectedFaceId(null);
  }, [selectFace]);

  return <div className="mx-auto max-w-[100rem]">
    <header className="mb-4 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-black uppercase tracking-[.18em] text-[var(--muted)]">{gymName}</p><h1 className="mt-1 text-3xl font-black tracking-tight md:text-5xl">Explore the gym</h1><p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Choose a wall, discover its routes, then highlight the holds for your next climb.</p></div>{isStaff ? <Link className="min-h-11 rounded-[var(--radius-md)] bg-[var(--foreground)] px-5 py-3 text-sm font-black text-[var(--background)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-600" href={role === "owner" ? `/g/${gymSlug}/staff/floorplan` : `/g/${gymSlug}/staff/routes`}>Open editing tools</Link> : null}</header>
    {!structures.length ? <section className="grid min-h-64 place-items-center rounded-[var(--radius-panel)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)] p-8 text-center"><div><h2 className="text-2xl font-black">The floorplan is being prepared</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">There are no walls to explore yet. Gym staff can publish the digital map when it is ready.</p>{isStaff ? <Link className="mt-5 inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--primary)] px-5 font-bold text-white" href={`/g/${gymSlug}/staff/floorplan`}>Create the floorplan</Link> : null}</div></section> : <div className={`grid gap-4 ${selectedStructure ? "xl:grid-cols-[minmax(0,1fr)_28rem]" : ""}`}>
      <FloorplanMap configuration={configuration} onSelect={selectStructure} selectedId={selectedStructure?.id ?? null} structures={structures}/>
      {selectedStructure ? <aside aria-label={`${selectedStructure.name} routes`} className="max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl xl:sticky xl:top-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-lime-700">Selected wall</p><h2 className="text-3xl font-black">{selectedStructure.name}</h2><p className="mt-1 text-sm text-[var(--muted)]">{wallLength(selectedStructure).toFixed(1)} m · {selectedStructure.faces.length} {selectedStructure.faces.length === 1 ? "face" : "faces"}</p></div><button aria-label="Close wall details" className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] border text-xl hover:bg-[var(--surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-700" onClick={() => { requestSequence.current += 1; setSelectedStructure(null); setSelectedFaceId(null); setDetail(null); }} type="button">×</button></div>
        {selectedStructure.faces.length ? <div aria-label="Climbing faces" className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist">{selectedStructure.faces.map((face) => <button aria-selected={selectedFaceId === face.id} className="min-h-11 shrink-0 rounded-[var(--radius-md)] border px-4 text-sm font-bold aria-selected:border-lime-700 aria-selected:bg-lime-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-700" key={face.id} onClick={() => selectFace(face.id)} role="tab" type="button">{face.name}</button>)}</div> : <p className="mt-5 rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted)]">This structure does not have a climbing face yet.</p>}
        {pending ? <div aria-live="polite" className="mt-5 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] p-6 text-sm font-bold">Loading this wall’s routes…</div> : null}
        {!pending && detail?.status === "error" ? <div className="mt-5 rounded-[var(--radius-lg)] bg-red-50 p-4 text-sm text-red-800"><p>{detail.message}</p>{selectedFaceId ? <button className="mt-3 font-bold underline" onClick={() => selectFace(selectedFaceId)} type="button">Try again</button> : null}</div> : null}
        {!pending && detail?.status === "success" ? <div className="mt-5 space-y-5"><WallRoutePreview detail={detail} selectedRoute={selectedRoute}/><section><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-black">Routes</h3><span className="rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-bold">{detail.routes.length}</span></div>{detail.routes.length ? <ul className="mt-3 grid gap-2">{detail.routes.map((route) => <li key={route.id}><button aria-pressed={route.id === selectedRouteId} className="flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-md)] border p-3 text-left hover:border-lime-700 hover:bg-lime-50 aria-pressed:border-lime-700 aria-pressed:bg-lime-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-700" onClick={() => setSelectedRouteId(route.id)} type="button"><span aria-hidden="true" className="size-5 shrink-0 rounded-full border-2 border-white shadow" style={{ backgroundColor: routeColour(route.colour) }}/><span className="min-w-0 flex-1"><strong className="block truncate">{route.name}</strong><span className="text-xs text-[var(--muted)]">{route.grade} · {route.discipline.replaceAll("_", " ")} · {route.setterName}</span></span><span aria-hidden="true">›</span></button></li>)}</ul> : <p className="mt-3 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted)]">No routes are currently published on this face.</p>}</section>
          {selectedRoute ? <section aria-label={`${selectedRoute.name} details`} className="space-y-5 border-t border-[var(--border)] pt-5"><RouteMetadata route={selectedRoute}/><details className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4"><summary className="cursor-pointer text-lg font-black">Log an ascent</summary><div className="mt-4"><AscentForm gymSlug={gymSlug} key={selectedRoute.id} routeId={selectedRoute.id} sessions={detail.sessions}/></div></details><details className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4"><summary className="cursor-pointer text-lg font-black">Favourite or leave feedback</summary><div className="mt-4"><RouteFeedbackControls favourite={selectedRoute.favourite} gymSlug={gymSlug} key={selectedRoute.id} routeId={selectedRoute.id} submitted={selectedRoute.submittedFeedback}/></div></details><Link className="inline-flex min-h-11 items-center font-bold underline underline-offset-4" href={`/g/${gymSlug}/app/routes/${selectedRoute.id}`}>Open full route page</Link></section> : detail.routes.length ? <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] p-4 text-center text-sm text-[var(--muted)]">Tap a route to highlight only its holds and see its details.</p> : null}</div> : null}
      </aside> : null}
    </div>}
  </div>;
}

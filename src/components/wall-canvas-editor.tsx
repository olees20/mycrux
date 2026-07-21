"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type DragEvent as ReactDragEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { HoldGlyph, HoldIcon } from "@/components/hold-icon";
import { saveWallCanvasAction } from "@/features/floorplan/wall-canvas-actions";
import { replacePhysicalHoldAction, retirePhysicalHoldAction, saveHoldRouteAssignmentsAction, saveWallHoldsAction } from "@/features/floorplan/hold-actions";
import { duplicateHold, holdCategories, holdCategoryLabel, holdConditions, normalizeRotation, serializeHold, type HoldCategory, type HoldInventoryEvent, type WallHold } from "@/features/floorplan/holds";
import { metreRulerTicks, snapCanvasPoint, type WallCanvasConfiguration } from "@/features/floorplan/wall-canvas";
import type { Point } from "@/features/floorplan/core";
import type { HoldBasedRoute } from "@/features/routes/definitions";

const buttonClass = "min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-40";
const inputClass = "mt-1 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2";
const defaultColours: Record<HoldCategory, string> = { jug: "#65a30d", crimp: "#dc2626", sloper: "#2563eb", pinch: "#9333ea", pocket: "#ea580c", edge: "#0891b2", volume: "#57534e", macro: "#db2777", dual_texture: "#0f766e", foothold: "#ca8a04" };
const holdBaseSize = (category: HoldCategory) => category === "volume" ? 1.3 : category === "macro" ? 0.9 : category === "foothold" ? 0.3 : 0.5;

type EditorSnapshot={holds:WallHold[];assignments:Record<string,string[]>};
const assignmentSignature=(value:Record<string,string[]>)=>JSON.stringify(Object.keys(value).filter((key)=>value[key].length>0).toSorted().map((key)=>[key,[...value[key]].toSorted()]));

export function WallCanvasEditor({ angleDegrees, configuration: initialConfiguration, faceId, faceName, gymSlug, heightMetres, holdsRevision: initialHoldsRevision, initialHolds, initialRevision, initialRouteAssignments, inventoryHistory, routes, structureName, widthMetres }: { angleDegrees: number; configuration: WallCanvasConfiguration; faceId: string; faceName: string; gymSlug: string; heightMetres: number; holdsRevision: number; initialHolds: WallHold[]; initialRevision: number; initialRouteAssignments: Record<string,string[]>; inventoryHistory: Record<string,HoldInventoryEvent[]>; routes: HoldBasedRoute[]; structureName: string; widthMetres: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const [revision, setRevision] = useState(initialRevision);
  const [holds, setHolds] = useState(initialHolds);
  const [savedHolds,setSavedHolds]=useState(initialHolds);
  const [routeAssignments,setRouteAssignments]=useState(initialRouteAssignments);
  const [savedRouteAssignments,setSavedRouteAssignments]=useState(initialRouteAssignments);
  const [routeRevisions,setRouteRevisions]=useState<Record<string,number>>(()=>Object.fromEntries(routes.map((route)=>[route.id,route.historyRevision])));
  const [past,setPast]=useState<EditorSnapshot[]>([]);const[future,setFuture]=useState<EditorSnapshot[]>([]);
  const [holdsRevision, setHoldsRevision] = useState(initialHoldsRevision);
  const [selectedHoldId, setSelectedHoldId] = useState<string | null>(initialHolds[0]?.id ?? null);
  const [libraryCategory, setLibraryCategory] = useState<HoldCategory | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [panning, setPanning] = useState<{ client: Point; origin: Point } | null>(null);
  const [holdDrag, setHoldDrag] = useState<string | null>(null);
  const [tool, setTool] = useState<"select" | "pan">("select");
  const [cursor, setCursor] = useState<Point | null>(null);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("Canvas settings are saved.");
  const [holdsMessage, setHoldsMessage] = useState("Hold library is saved.");
  const [settingsStatus, setSettingsStatus] = useState<"neutral" | "success" | "error">("neutral");
  const [holdsStatus, setHoldsStatus] = useState<"neutral" | "success" | "error">("neutral");
  const [savingSettings, startSavingSettings] = useTransition();
  const [savingHolds, startSavingHolds] = useTransition();
  const [savingAssignments,startSavingAssignments]=useTransition();
  const [operatingPhysical,startOperatingPhysical]=useTransition();
  const selectedHold = holds.find(({ id }) => id === selectedHoldId) ?? null;
  const holdsDirty=useMemo(()=>JSON.stringify(holds)!==JSON.stringify(savedHolds),[holds,savedHolds]);
  const assignmentsDirty=useMemo(()=>assignmentSignature(routeAssignments)!==assignmentSignature(savedRouteAssignments),[routeAssignments,savedRouteAssignments]);
  const routeById=useMemo(()=>new Map(routes.map((route)=>[route.id,route])),[routes]);
  const viewBox = useMemo(() => ({ x: pan.x, y: pan.y, width: widthMetres / zoom, height: heightMetres / zoom }), [heightMetres, pan, widthMetres, zoom]);
  const xTicks = useMemo(() => metreRulerTicks(widthMetres), [widthMetres]);
  const yTicks = useMemo(() => metreRulerTicks(heightMetres), [heightMetres]);
  const xLabelEvery = Math.max(1, Math.ceil(viewBox.width / 12));
  const yLabelEvery = Math.max(1, Math.ceil(viewBox.height / 8));

  function rawPoint(event: { clientX: number; clientY: number }) {
    const svg = svgRef.current; if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const matrix = svg.getScreenCTM(); if (!matrix) return { x: 0, y: 0 };
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: heightMetres - transformed.y };
  }

  function inspect(event: { clientX: number; clientY: number }) { return snapCanvasPoint(rawPoint(event), widthMetres, heightMetres, configuration.gridSizeMetres, configuration.snapToGrid); }
  function checkpoint(){setPast((current)=>[...current.slice(-49),{holds,assignments:routeAssignments}]);setFuture([]);}
  function markHoldsChanged(message = "Unsaved hold changes.") { setHoldsMessage(message); setHoldsStatus("neutral"); }

  function addHold(category: HoldCategory, position: Point) {
    const next: WallHold = { id: crypto.randomUUID(), category, iconKey: category, position, rotationDegrees: 0, scaleFactor: 1, metadata: { label: "", colour: defaultColours[category], manufacturer: "", model: "", purchaseDate: "", condition: "good", notes: "" }, createdAt: new Date().toISOString() };
    checkpoint();setHolds((current) => [...current, next]); setSelectedHoldId(next.id); setLibraryCategory(null); markHoldsChanged(`${holdCategoryLabel(category)} added. Save the hold library to persist it.`);
  }

  function updateHold(id: string, values: Partial<WallHold>,record=true) {
    if(record)checkpoint();setHolds((current) => current.map((hold) => hold.id === id ? { ...hold, ...values } : hold)); markHoldsChanged();
  }

  function undo(){const snapshot=past.at(-1);if(!snapshot)return;setFuture((current)=>[{holds,assignments:routeAssignments},...current].slice(0,50));setPast((current)=>current.slice(0,-1));setHolds(snapshot.holds);setRouteAssignments(snapshot.assignments);setSelectedHoldId((current)=>snapshot.holds.some(({id})=>id===current)?current:null);markHoldsChanged("Undo applied. Save the affected changes to persist it.");}
  function redo(){const snapshot=future[0];if(!snapshot)return;setPast((current)=>[...current.slice(-49),{holds,assignments:routeAssignments}]);setFuture((current)=>current.slice(1));setHolds(snapshot.holds);setRouteAssignments(snapshot.assignments);setSelectedHoldId((current)=>snapshot.holds.some(({id})=>id===current)?current:null);markHoldsChanged("Redo applied. Save the affected changes to persist it.");}

  function pointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (tool === "pan" || event.altKey || event.button === 1) { event.currentTarget.setPointerCapture(event.pointerId); setPanning({ client: { x: event.clientX, y: event.clientY }, origin: pan }); return; }
    const point = inspect(event); setCursor(point);
    if (libraryCategory) addHold(libraryCategory, point); else setSelectedHoldId(null);
  }

  function pointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (panning) {
      const rect = event.currentTarget.getBoundingClientRect(); setPan({ x: panning.origin.x - (event.clientX - panning.client.x) * viewBox.width / rect.width, y: panning.origin.y - (event.clientY - panning.client.y) * viewBox.height / rect.height }); return;
    }
    const point = inspect(event); setCursor(point);
    if (holdDrag) updateHold(holdDrag, { position: point },false);
  }

  function pointerUp(event: ReactPointerEvent<SVGSVGElement>) { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); setPanning(null); setHoldDrag(null); }

  function beginHoldDrag(event: ReactPointerEvent<SVGGElement>, holdId: string) {
    event.stopPropagation(); checkpoint();setSelectedHoldId(holdId); setLibraryCategory(null); setTool("select"); svgRef.current?.setPointerCapture(event.pointerId); setHoldDrag(holdId);
  }

  function dropLibraryHold(event: ReactDragEvent<SVGSVGElement>) {
    event.preventDefault(); const value = event.dataTransfer.getData("application/x-mycrux-hold") as HoldCategory;
    if (holdCategories.includes(value)) addHold(value, inspect(event));
  }

  function wheel(event: ReactWheelEvent<SVGSVGElement>) { event.preventDefault(); setZoom((value) => Math.min(8, Math.max(0.5, value * (event.deltaY > 0 ? 0.9 : 1.1)))); }

  function keyboard(event: ReactKeyboardEvent<SVGSVGElement>) {
    const command = event.metaKey || event.ctrlKey;
    if (command && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
    if (command && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); return; }
    const movement = event.shiftKey ? 0.5 : configuration.snapToGrid ? configuration.gridSizeMetres : 0.05;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) event.preventDefault();
    if (selectedHold && tool === "select" && event.key.startsWith("Arrow")) {
      const delta = { x: event.key === "ArrowLeft" ? -movement : event.key === "ArrowRight" ? movement : 0, y: event.key === "ArrowDown" ? -movement : event.key === "ArrowUp" ? movement : 0 };
      updateHold(selectedHold.id, { position: snapCanvasPoint({ x: selectedHold.position.x + delta.x, y: selectedHold.position.y + delta.y }, widthMetres, heightMetres, configuration.gridSizeMetres, configuration.snapToGrid) }); return;
    }
    if (event.key === "ArrowLeft") setPan((value) => ({ ...value, x: value.x - movement }));
    if (event.key === "ArrowRight") setPan((value) => ({ ...value, x: value.x + movement }));
    if (event.key === "ArrowUp") setPan((value) => ({ ...value, y: value.y - movement }));
    if (event.key === "ArrowDown") setPan((value) => ({ ...value, y: value.y + movement }));
    if (event.key === "+" || event.key === "=") setZoom((value) => Math.min(8, value * 1.25));
    if (event.key === "-") setZoom((value) => Math.max(0.5, value / 1.25));
    if ((event.key === "Delete" || event.key === "Backspace") && selectedHold) { event.preventDefault(); setHoldsMessage("Use Delete / retire hold in the side panel so route and inventory history remain intact."); setHoldsStatus("neutral"); }
  }

  function changeSettings(values: Partial<WallCanvasConfiguration>) { setConfiguration((current) => ({ ...current, ...values })); setSettingsDirty(true); setSettingsMessage("Unsaved canvas settings."); setSettingsStatus("neutral"); }

  function saveSettings() {
    startSavingSettings(async () => { try { const result = await saveWallCanvasAction({ gymSlug, faceId, expectedRevision: revision, gridSizeMetres: configuration.gridSizeMetres, showGrid: configuration.showGrid, snapToGrid: configuration.snapToGrid }); setSettingsMessage(result.message); setSettingsStatus(result.status === "success" ? "success" : "error"); if (result.status === "success") { setRevision(result.revision); setSettingsDirty(false); } } catch { setSettingsMessage("The canvas settings could not be saved. Check your connection and try again."); setSettingsStatus("error"); } });
  }

  function saveHolds() {
    startSavingHolds(async () => { try { const result = await saveWallHoldsAction({ gymSlug, faceId, expectedRevision: holdsRevision, widthMetres, heightMetres, holds: holds.map(serializeHold) }); setHoldsMessage(result.message); setHoldsStatus(result.status === "success" ? "success" : "error"); if (result.status === "success") { setHoldsRevision(result.revision); setSavedHolds(holds); } } catch { setHoldsMessage("The holds could not be saved. Check your connection and try again."); setHoldsStatus("error"); } });
  }

  function toggleRouteAssignment(holdId:string,routeId:string){checkpoint();setRouteAssignments((current)=>{const assigned=current[holdId]??[];return{...current,[holdId]:assigned.includes(routeId)?assigned.filter((id)=>id!==routeId):[...assigned,routeId]};});setHoldsMessage("Unsaved route membership changes.");setHoldsStatus("neutral");}
  function saveAssignments(){
    const changed=Object.keys(routeAssignments).filter((holdId)=>assignmentSignature({[holdId]:routeAssignments[holdId]??[]})!==assignmentSignature({[holdId]:savedRouteAssignments[holdId]??[]}));
    startSavingAssignments(async()=>{try{const result=await saveHoldRouteAssignmentsAction({gymSlug,faceId,routeRevisions,assignments:changed.map((holdId)=>({holdId,routeIds:(routeAssignments[holdId]??[]).filter((routeId)=>routeById.get(routeId)?.status!=="archived")}))});setHoldsMessage(result.message);setHoldsStatus(result.status==="success"?"success":"error");if(result.status==="success"){setSavedRouteAssignments(routeAssignments);setRouteRevisions((current)=>({...current,...result.routeRevisions}));}}catch{setHoldsMessage("Route assignments could not be saved. Check your connection and try again.");setHoldsStatus("error");}});
  }
  function replaceSelectedHold(){if(!selectedHold)return;startOperatingPhysical(async()=>{try{const result=await replacePhysicalHoldAction({gymSlug,faceId,holdId:selectedHold.id,replacementHoldId:crypto.randomUUID(),expectedRevision:holdsRevision});setHoldsMessage(result.message);setHoldsStatus(result.status==="success"?"success":"error");if(result.status==="success")window.location.reload();}catch{setHoldsMessage("The physical hold could not be replaced. Check your connection and try again.");setHoldsStatus("error");}});}
  function retireSelectedHold(){if(!selectedHold)return;startOperatingPhysical(async()=>{try{const result=await retirePhysicalHoldAction({gymSlug,faceId,holdId:selectedHold.id,expectedRevision:holdsRevision});setHoldsMessage(result.message);setHoldsStatus(result.status==="success"?"success":"error");if(result.status==="success")window.location.reload();}catch{setHoldsMessage("The physical hold could not be retired. Check your connection and try again.");setHoldsStatus("error");}});}

  useEffect(() => { if (!settingsDirty && !holdsDirty&&!assignmentsDirty) return; const warn = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [assignmentsDirty,holdsDirty, settingsDirty]);

  const cursorScreenY = cursor ? heightMetres - cursor.y : null;
  const fontSize = Math.max(0.11, Math.min(widthMetres, heightMetres) / 35 / zoom);
  const tickLength = Math.max(0.08, Math.min(widthMetres, heightMetres) / 70 / zoom);

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
    <section className="min-w-0 overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm" aria-labelledby="wall-canvas-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-3"><div className="flex flex-wrap gap-2" aria-label="Wall canvas tools"><button aria-pressed={tool === "select"} className={`${buttonClass} ${tool === "select" ? "bg-black text-white" : ""}`} onClick={() => { setTool("select"); setLibraryCategory(null); }} type="button">Select holds</button><button aria-pressed={tool === "pan"} className={`${buttonClass} ${tool === "pan" ? "bg-black text-white" : ""}`} onClick={() => { setTool("pan"); setLibraryCategory(null); }} type="button">Pan</button><button className={buttonClass} disabled={!past.length} onClick={undo} type="button">Undo</button><button className={buttonClass} disabled={!future.length} onClick={redo} type="button">Redo</button><span className="inline-flex min-h-11 items-center rounded-xl bg-stone-100 px-3 text-sm font-bold">{holds.length} holds</span></div><div className="flex items-center gap-2"><button aria-label="Zoom out" className={buttonClass} disabled={zoom <= 0.5} onClick={() => setZoom((value) => Math.max(0.5, value / 1.25))} type="button">−</button><output className="min-w-14 text-center text-sm font-bold">{Math.round(zoom * 100)}%</output><button aria-label="Zoom in" className={buttonClass} disabled={zoom >= 8} onClick={() => setZoom((value) => Math.min(8, value * 1.25))} type="button">+</button><button className={buttonClass} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} type="button">Fit</button></div></div>
      <h2 className="sr-only" id="wall-canvas-heading">Hold canvas for {faceName}</h2>
      <div className="relative h-[72vh] min-h-[34rem] bg-stone-200 p-4">
        <svg aria-describedby="wall-canvas-help" aria-label={`${faceName} hold canvas, ${widthMetres} metres wide by ${heightMetres} metres high, containing ${holds.length} route-independent holds.`} className={`h-full w-full touch-none select-none rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-600 ${tool === "pan" ? "cursor-grab" : libraryCategory ? "cursor-copy" : "cursor-crosshair"}`} onDragOver={(event) => event.preventDefault()} onDrop={dropLibraryHold} onKeyDown={keyboard} onPointerCancel={pointerUp} onPointerDown={pointerDown} onPointerLeave={() => { if (!panning && !holdDrag) setCursor(null); }} onPointerMove={pointerMove} onPointerUp={pointerUp} onWheel={wheel} preserveAspectRatio="xMidYMid meet" ref={svgRef} role="application" tabIndex={0} viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}>
          <defs><pattern height={configuration.gridSizeMetres} id="wall-grid" patternUnits="userSpaceOnUse" width={configuration.gridSizeMetres}><path d={`M ${configuration.gridSizeMetres} 0 L 0 0 0 ${configuration.gridSizeMetres}`} fill="none" stroke="#78716c" strokeOpacity=".22" strokeWidth={0.015 / zoom}/></pattern></defs>
          <rect fill="#fafaf9" height={heightMetres} stroke="#1c1917" strokeWidth={0.05 / zoom} width={widthMetres}/>{configuration.showGrid ? <rect fill="url(#wall-grid)" height={heightMetres} pointerEvents="none" width={widthMetres}/> : null}
          <g aria-hidden="true" fill="#292524" stroke="#292524">{xTicks.map((tick) => <g key={`x-${tick}`}><line strokeWidth={0.025 / zoom} x1={tick} x2={tick} y1={heightMetres} y2={heightMetres - tickLength}/>{tick % xLabelEvery === 0 ? <text fontSize={fontSize} stroke="none" textAnchor={tick === 0 ? "start" : tick === Math.floor(widthMetres) ? "end" : "middle"} x={tick} y={heightMetres - tickLength - fontSize * 0.25}>{tick}m</text> : null}</g>)}{yTicks.map((tick) => { const screenY = heightMetres - tick; return <g key={`y-${tick}`}><line strokeWidth={0.025 / zoom} x1="0" x2={tickLength} y1={screenY} y2={screenY}/>{tick % yLabelEvery === 0 ? <text dominantBaseline={tick === 0 ? "auto" : tick === Math.floor(heightMetres) ? "hanging" : "middle"} fontSize={fontSize} stroke="none" x={tickLength + fontSize * 0.2} y={screenY}>{tick}m</text> : null}</g>; })}<rect fill="#65a30d" height={tickLength} stroke="none" width={tickLength} x={0} y={heightMetres - tickLength}/></g>
          {holds.map((hold) => { const size = holdBaseSize(hold.category) * hold.scaleFactor; const selected = hold.id === selectedHoldId; return <g aria-label={`${hold.metadata.label || holdCategoryLabel(hold.category)} at ${hold.position.x.toFixed(2)}, ${hold.position.y.toFixed(2)} metres`} className="cursor-move outline-none" key={hold.id} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); setSelectedHoldId(hold.id); } }} onPointerDown={(event) => beginHoldDrag(event, hold.id)} role="button" style={{ color: hold.metadata.colour }} tabIndex={0} transform={`translate(${hold.position.x} ${heightMetres - hold.position.y}) rotate(${-hold.rotationDegrees}) scale(${size})`}><rect fill="transparent" height="1.3" width="1.3" x="-.65" y="-.65"/><HoldGlyph category={hold.iconKey}/>{selected ? <rect fill="none" height="1.25" stroke="#1c1917" strokeDasharray=".12 .08" strokeWidth={0.04 / Math.max(size, 0.1) / zoom} width="1.25" x="-.625" y="-.625"/> : null}</g>; })}
          {cursor && cursorScreenY !== null && !holdDrag ? <g aria-hidden="true" pointerEvents="none"><line stroke="#65a30d" strokeDasharray={`${0.12 / zoom} ${0.08 / zoom}`} strokeWidth={0.025 / zoom} x1={cursor.x} x2={cursor.x} y1="0" y2={heightMetres}/><line stroke="#65a30d" strokeDasharray={`${0.12 / zoom} ${0.08 / zoom}`} strokeWidth={0.025 / zoom} x1="0" x2={widthMetres} y1={cursorScreenY} y2={cursorScreenY}/><path d={`M ${cursor.x} ${cursorScreenY - 0.1 / zoom} L ${cursor.x + 0.1 / zoom} ${cursorScreenY} L ${cursor.x} ${cursorScreenY + 0.1 / zoom} L ${cursor.x - 0.1 / zoom} ${cursorScreenY} Z`} fill="#65a30d"/></g> : null}
        </svg>
        <output aria-live="polite" className="absolute bottom-7 left-7 rounded-lg bg-white/95 px-3 py-2 font-mono text-xs font-bold shadow-sm">{cursor ? `x ${cursor.x.toFixed(3)} m · y ${cursor.y.toFixed(3)} m${configuration.snapToGrid ? " · snapped" : ""}` : libraryCategory ? `Click to place ${holdCategoryLabel(libraryCategory)}` : "Origin 0,0 at bottom-left"}</output>
      </div>
      <p className="border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted)]" id="wall-canvas-help">Drag a library icon onto the wall, or choose one then click. Drag installed holds to move them. Arrow keys nudge a selected hold; Shift moves 0.5 m. Use Command/Ctrl+Z and Command/Ctrl+Shift+Z for undo and redo.</p>
    </section>

    <aside className="space-y-5"><section className="rounded-3xl border border-[var(--border)] bg-white p-5"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--muted)]">Reusable objects · revision {holdsRevision}</p><div className="flex items-center justify-between gap-3"><h2 className="mt-1 text-xl font-black">Hold Library</h2><button className="min-h-10 rounded-xl bg-black px-3 text-sm font-bold text-white disabled:opacity-50" disabled={!holdsDirty || savingHolds} onClick={saveHolds} type="button">{savingHolds ? "Saving…" : holdsDirty ? "Save holds" : "Saved"}</button></div><div className="mt-4 grid grid-cols-2 gap-2">{holdCategories.map((category) => <button aria-pressed={libraryCategory === category} className={`flex min-h-20 flex-col items-center justify-center rounded-xl border p-2 text-xs font-bold capitalize focus:outline-none focus:ring-2 focus:ring-black ${libraryCategory === category ? "border-black bg-lime-100" : "bg-stone-50"}`} draggable key={category} onClick={() => { setLibraryCategory((current) => current === category ? null : category); setTool("select"); }} onDragStart={(event) => { event.dataTransfer.setData("application/x-mycrux-hold", category); event.dataTransfer.effectAllowed = "copy"; }} type="button"><HoldIcon category={category} className="mb-1 h-9 w-9"/>{holdCategoryLabel(category)}</button>)}</div><p aria-live="polite" className={`mt-3 text-sm ${holdsStatus === "error" ? "text-red-700" : holdsStatus === "success" ? "text-emerald-700" : "text-[var(--muted)]"}`}>{holdsMessage}</p></section>

      <section className="rounded-3xl border border-[var(--border)] bg-white p-5" aria-labelledby="selected-hold-heading">
        <h2 className="text-xl font-black" id="selected-hold-heading">Selected physical hold</h2>
        {selectedHold ? <div className="mt-4 space-y-4" key={selectedHold.id}>
          <div className="flex items-center gap-3"><span className="grid h-14 w-14 place-items-center rounded-xl bg-stone-100" style={{ color: selectedHold.metadata.colour }}><HoldIcon category={selectedHold.iconKey} className="h-10 w-10"/></span><div className="min-w-0"><p className="font-black">{selectedHold.metadata.label || holdCategoryLabel(selectedHold.category)}</p><code className="block truncate text-[.65rem] text-[var(--muted)]">{selectedHold.id}</code></div></div>
          <label className="text-sm font-bold">Category<select className={inputClass} onChange={(event) => { const category=event.target.value as HoldCategory;updateHold(selectedHold.id,{category,iconKey:category}); }} value={selectedHold.category}>{holdCategories.map((category)=><option key={category} value={category}>{holdCategoryLabel(category)}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3"><label className="text-sm font-bold">X position (m)<input className={inputClass} max={widthMetres} min="0" onChange={(event)=>updateHold(selectedHold.id,{position:snapCanvasPoint({...selectedHold.position,x:Number(event.target.value)},widthMetres,heightMetres,configuration.gridSizeMetres,configuration.snapToGrid)})} step="0.01" type="number" value={selectedHold.position.x}/></label><label className="text-sm font-bold">Y position (m)<input className={inputClass} max={heightMetres} min="0" onChange={(event)=>updateHold(selectedHold.id,{position:snapCanvasPoint({...selectedHold.position,y:Number(event.target.value)},widthMetres,heightMetres,configuration.gridSizeMetres,configuration.snapToGrid)})} step="0.01" type="number" value={selectedHold.position.y}/></label><label className="text-sm font-bold">Rotation (°)<input className={inputClass} max="359.999" min="0" onChange={(event)=>updateHold(selectedHold.id,{rotationDegrees:normalizeRotation(Number(event.target.value))})} step="1" type="number" value={selectedHold.rotationDegrees}/></label><label className="text-sm font-bold">Scale<input className={inputClass} max="10" min="0.1" onChange={(event)=>updateHold(selectedHold.id,{scaleFactor:Number(event.target.value)})} step="0.1" type="number" value={selectedHold.scaleFactor}/></label></div>
          <div className="grid grid-cols-3 gap-2"><button className={buttonClass} onClick={()=>updateHold(selectedHold.id,{rotationDegrees:normalizeRotation(selectedHold.rotationDegrees-15)})} type="button">−15°</button><button className={buttonClass} onClick={()=>updateHold(selectedHold.id,{rotationDegrees:normalizeRotation(selectedHold.rotationDegrees+15)})} type="button">+15°</button><button className={buttonClass} onClick={()=>updateHold(selectedHold.id,{scaleFactor:Math.min(10,Number((selectedHold.scaleFactor+0.1).toFixed(3)))})} type="button">Larger</button></div>
          <label className="text-sm font-bold">Inventory label<input className={inputClass} maxLength={100} onChange={(event)=>updateHold(selectedHold.id,{metadata:{...selectedHold.metadata,label:event.target.value}})} value={selectedHold.metadata.label}/></label>
          <div className="grid grid-cols-2 gap-3"><label className="text-sm font-bold">Colour<input className={`${inputClass} h-12 p-1`} onChange={(event)=>updateHold(selectedHold.id,{metadata:{...selectedHold.metadata,colour:event.target.value}})} type="color" value={selectedHold.metadata.colour}/></label><label className="text-sm font-bold">Condition<select className={inputClass} onChange={(event)=>updateHold(selectedHold.id,{metadata:{...selectedHold.metadata,condition:event.target.value as typeof selectedHold.metadata.condition}})} value={selectedHold.metadata.condition}>{holdConditions.map((condition)=><option key={condition} value={condition}>{condition}</option>)}</select></label></div>
          <label className="text-sm font-bold">Manufacturer<input className={inputClass} maxLength={100} onChange={(event)=>updateHold(selectedHold.id,{metadata:{...selectedHold.metadata,manufacturer:event.target.value}})} value={selectedHold.metadata.manufacturer}/></label><label className="text-sm font-bold">Model<input className={inputClass} maxLength={120} onChange={(event)=>updateHold(selectedHold.id,{metadata:{...selectedHold.metadata,model:event.target.value}})} value={selectedHold.metadata.model}/></label><label className="text-sm font-bold">Purchase date<input className={inputClass} onChange={(event)=>updateHold(selectedHold.id,{metadata:{...selectedHold.metadata,purchaseDate:event.target.value}})} type="date" value={selectedHold.metadata.purchaseDate}/></label>
          <div className="rounded-xl bg-stone-50 p-3 text-sm"><span className="font-bold">Current wall:</span> {faceName}</div>
          <fieldset className="rounded-2xl border border-[var(--border)] p-3"><legend className="px-1 text-sm font-black">Belongs to</legend>{routes.length?<div className="mt-1 max-h-52 space-y-2 overflow-auto">{routes.map((route)=>{const assigned=(routeAssignments[selectedHold.id]??[]).includes(route.id);const archived=route.status==="archived";return <label className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm ${archived?"bg-stone-100 text-[var(--muted)]":"bg-white hover:bg-lime-50"}`} key={route.id}><input checked={assigned} disabled={archived} onChange={()=>toggleRouteAssignment(selectedHold.id,route.id)} type="checkbox"/><span className="h-3 w-3 shrink-0 rounded-full border border-black/20" style={{backgroundColor:route.colour}}/><span className="min-w-0 flex-1 font-bold">{route.name} · {route.grade}</span>{archived?<span className="text-xs">Archived</span>:null}</label>;})}</div>:<p className="mt-1 text-sm text-[var(--muted)]">Create a route before assigning this hold.</p>}<button className="mt-3 min-h-11 w-full rounded-xl bg-black px-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-40" disabled={!assignmentsDirty||savingAssignments||holdsDirty} onClick={saveAssignments} type="button">{savingAssignments?"Saving routes…":assignmentsDirty?"Save route assignments":"Route assignments saved"}</button>{holdsDirty&&assignmentsDirty?<p className="mt-2 text-xs text-[var(--muted)]">Save physical hold changes before saving route assignments.</p>:null}</fieldset>
          <label className="text-sm font-bold">Notes<textarea className={`${inputClass} min-h-20`} maxLength={1000} onChange={(event)=>updateHold(selectedHold.id,{metadata:{...selectedHold.metadata,notes:event.target.value}})} value={selectedHold.metadata.notes}/></label>
          <div><h3 className="text-sm font-black">Inventory history</h3>{inventoryHistory[selectedHold.id]?.length?<ol className="mt-2 max-h-44 space-y-2 overflow-auto">{inventoryHistory[selectedHold.id].map((item)=><li className="rounded-lg bg-stone-50 p-2 text-xs" key={item.id}><span className="font-bold">{item.eventType.replaceAll("_"," ")}</span>{item.routeName?` · ${item.routeName}`:""}<time className="mt-1 block text-[var(--muted)]" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></li>)}</ol>:<p className="mt-1 text-xs text-[var(--muted)]">History begins when this physical hold is saved.</p>}</div>
          <div className="grid grid-cols-2 gap-2"><button className={buttonClass} onClick={()=>{checkpoint();const copy=duplicateHold(selectedHold,crypto.randomUUID(),widthMetres,heightMetres,configuration.gridSizeMetres);setHolds((current)=>[...current,copy]);setRouteAssignments((current)=>({...current,[copy.id]:[]}));setSelectedHoldId(copy.id);markHoldsChanged("Matching physical hold added. Save to create its inventory record.");}} type="button">Add matching hold</button><button className={buttonClass} disabled={holdsDirty||assignmentsDirty||operatingPhysical} onClick={replaceSelectedHold} type="button">{operatingPhysical?"Working…":"Replace hold"}</button></div>
          <button className="min-h-11 w-full rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-800 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2 disabled:opacity-40" disabled={holdsDirty||assignmentsDirty||operatingPhysical} onClick={retireSelectedHold} type="button">Delete / retire hold</button>{holdsDirty||assignmentsDirty?<p className="text-xs text-[var(--muted)]">Save or undo pending changes before replacing or retiring this physical hold.</p>:null}
        </div>:<p className="mt-3 text-sm text-[var(--muted)]">Select a hold on the wall or from the installed list.</p>}
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Installed holds</h2><span className="text-sm font-bold">{holds.length}</span></div>{holds.length ? <ol className="mt-3 max-h-64 space-y-2 overflow-auto">{holds.map((hold, index) => <li key={hold.id}><button className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-black ${hold.id === selectedHoldId ? "bg-lime-100" : "bg-stone-50"}`} onClick={() => { setSelectedHoldId(hold.id); setLibraryCategory(null); setTool("select"); }} type="button"><span style={{ color: hold.metadata.colour }}><HoldIcon category={hold.iconKey} className="h-7 w-7"/></span><span className="min-w-0 flex-1 truncate font-bold">{hold.metadata.label || `${holdCategoryLabel(hold.category)} ${index + 1}`}</span><span className="text-xs tabular-nums text-[var(--muted)]">{hold.position.x.toFixed(2)}, {hold.position.y.toFixed(2)}</span></button></li>)}</ol> : <p className="mt-3 rounded-xl bg-stone-50 p-4 text-sm text-[var(--muted)]">Drag a reusable icon onto the wall to create the first hold.</p>}</section>

      <section className="rounded-3xl border border-[var(--border)] bg-white p-5"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--muted)]">Canvas · revision {revision}</p><h2 className="mt-1 text-xl font-black">{faceName}</h2><p className="text-sm text-[var(--muted)]">{structureName} · {widthMetres} × {heightMetres} m · {angleDegrees}°</p><label className="mt-4 block text-sm font-bold">Snap interval (m)<input className={inputClass} max="5" min="0.05" onChange={(event) => changeSettings({ gridSizeMetres: Number(event.target.value) })} step="0.05" type="number" value={configuration.gridSizeMetres}/></label><div className="mt-4 space-y-3"><label className="flex items-center gap-3 text-sm font-bold"><input checked={configuration.showGrid} onChange={(event) => changeSettings({ showGrid: event.target.checked })} type="checkbox"/>Show grid</label><label className="flex items-center gap-3 text-sm font-bold"><input checked={configuration.snapToGrid} onChange={(event) => changeSettings({ snapToGrid: event.target.checked })} type="checkbox"/>Snap to grid</label></div><button className="mt-4 min-h-11 w-full rounded-full bg-black px-4 text-sm font-bold text-white disabled:opacity-50" disabled={!settingsDirty || savingSettings} onClick={saveSettings} type="button">{savingSettings ? "Saving…" : settingsDirty ? "Save canvas settings" : "Settings saved"}</button><p aria-live="polite" className={`mt-3 text-sm ${settingsStatus === "error" ? "text-red-700" : settingsStatus === "success" ? "text-emerald-700" : "text-[var(--muted)]"}`}>{settingsMessage}</p></section></aside>
  </div>;
}

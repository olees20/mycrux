"use client";

import { CameraControls, ContactShadows, Grid, Html } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import * as THREE from "three";
import { AscentForm } from "@/components/ascent-form";
import { RouteFeedbackControls } from "@/components/route-feedback-controls";
import { Button, buttonStyles } from "@/components/ui/button";
import { boundsFromPoints, buildWorldSurface, frameBounds, structureBasis, surfaceDepthAt, surfacePoint, type Bounds3, type Vec3 } from "@/features/digital-twin/geometry";
import { loadMemberFaceAction } from "@/features/floorplan/member-map-actions";
import type { MemberFaceDetail, MemberMapFace, MemberMapHold, MemberMapRoute, MemberMapStructure } from "@/features/floorplan/member-map";
import type { MemberGymExperienceProps } from "@/components/member-gym-experience";

type CameraView = "fit" | "reset" | "top" | "front" | "perspective";
type CameraCommand = { id: number; view: CameraView };

const namedColours: Record<string, string> = { black: "#292524", white: "#f5f5f4", grey: "#78716c", gray: "#78716c", red: "#dc2626", orange: "#ea580c", yellow: "#eab308", green: "#16a34a", blue: "#2563eb", purple: "#9333ea", pink: "#db2777" };
const routeColour = (colour: string) => /^#[0-9a-f]{6}$/i.test(colour.trim()) ? colour.trim() : namedColours[colour.toLowerCase()] ?? "#65a30d";
const toThree = (value: Vec3) => new THREE.Vector3(value.x, value.y, value.z);

function faceGeometry(structure: MemberMapStructure, face: MemberMapFace) {
  return buildWorldSurface({ start: structure.start, end: structure.end, baseElevationMetres: structure.baseElevationMetres }, {
    widthMetres: face.widthMetres, heightMetres: face.heightMetres, angleDegrees: face.angleDegrees,
    surfaceKind: face.surfaceKind, facingDirection: face.facingDirection, localOffset: face.localOffset, vertices: face.vertices,
  });
}

function makeBufferGeometry(surface: ReturnType<typeof faceGeometry>) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(surface.vertices.flatMap(({ x, y, z }) => [x, y, z]), 3));
  geometry.setIndex(surface.triangleIndices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function StructureBacking({ structure, selected }: { structure: MemberMapStructure; selected: boolean }) {
  const length = Math.hypot(structure.end.x - structure.start.x, structure.end.y - structure.start.y);
  const height = Math.max(0.35, ...structure.faces.map((face) => Math.max(0.35, Math.cos(Math.min(89, Math.abs(face.angleDegrees)) * Math.PI / 180) * face.heightMetres)));
  const midpoint: [number, number, number] = [(structure.start.x + structure.end.x) / 2, (structure.baseElevationMetres ?? 0) + height / 2, (structure.start.y + structure.end.y) / 2];
  const rotation = -Math.atan2(structure.end.y - structure.start.y, structure.end.x - structure.start.x);
  return <mesh castShadow position={midpoint} receiveShadow rotation={[0, rotation, 0]}><boxGeometry args={[length, height, Math.max(0.08, structure.thicknessMetres)]}/><meshStandardMaterial color={selected ? "#cbd5a2" : "#d6d3d1"} metalness={0.02} roughness={0.9}/></mesh>;
}

function FaceSurface({ face, structure, selected, onSelect }: { face: MemberMapFace; structure: MemberMapStructure; selected: boolean; onSelect: () => void }) {
  const surface = useMemo(() => faceGeometry(structure, face), [face, structure]);
  const geometry = useMemo(() => makeBufferGeometry(surface), [surface]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const hotspot = toThree(surface.centre).add(toThree(surface.normal).multiplyScalar(0.28));
  return <group>
    <mesh castShadow geometry={geometry} onClick={(event) => { event.stopPropagation(); onSelect(); }} onDoubleClick={(event)=>{event.stopPropagation();onSelect();}} receiveShadow>
      <meshStandardMaterial color={selected ? "#d9f99d" : face.materialColour ?? "#e7e5e4"} emissive={selected ? "#365314" : "#000000"} emissiveIntensity={selected ? 0.08 : 0} metalness={0.01} polygonOffset polygonOffsetFactor={-1} roughness={0.82} side={THREE.DoubleSide}/>
    </mesh>
    <Html center distanceFactor={10} position={hotspot} transform={false} zIndexRange={[20, 0]}>
      <button aria-label={`Focus ${face.name} on ${structure.name}`} aria-pressed={selected} className={`group flex size-11 items-center justify-center rounded-full border-2 bg-white text-stone-950 shadow-lg transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-700 ${selected ? "border-lime-700" : "border-stone-900"}`} onClick={(event) => { event.stopPropagation(); onSelect(); }} type="button"><span aria-hidden="true" className={`size-2.5 rounded-full ${selected ? "bg-lime-600" : "bg-stone-900"}`}/><span className="pointer-events-none absolute left-1/2 top-12 hidden -translate-x-1/2 whitespace-nowrap rounded bg-stone-950 px-2 py-1 text-xs font-bold text-white group-hover:block">{face.name}</span></button>
    </Html>
  </group>;
}

function holdGeometry(category: MemberMapHold["category"]) {
  if (category === "volume") return new THREE.ConeGeometry(0.32, 0.16, 3);
  if (category === "macro") return new THREE.DodecahedronGeometry(0.24, 0);
  if (category === "crimp" || category === "edge") return new THREE.BoxGeometry(0.3, 0.11, 0.1, 1, 1, 1);
  if (category === "foothold") return new THREE.TetrahedronGeometry(0.13, 0);
  if (category === "pocket") return new THREE.TorusGeometry(0.16, 0.06, 8, 16);
  if (category === "pinch") return new THREE.CapsuleGeometry(0.09, 0.22, 4, 8);
  if (category === "sloper") return new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  return new THREE.IcosahedronGeometry(0.2, 1);
}

function HoldInstances({ structure, face, holds, routes, selectedRoute, onSelectRoute, lowQuality }: { structure: MemberMapStructure; face: MemberMapFace; holds: MemberMapHold[]; routes: MemberMapRoute[]; selectedRoute: MemberMapRoute | null; onSelectRoute: (id: string) => void; lowQuality: boolean }) {
  const selectedIds = useMemo(() => new Set(selectedRoute?.holdIds ?? []), [selectedRoute]);
  const routesByHold = useMemo(() => {
    const result = new Map<string, MemberMapRoute[]>();
    for (const route of routes) for (const holdId of route.holdIds) result.set(holdId, [...(result.get(holdId) ?? []), route]);
    return result;
  }, [routes]);
  const groups = useMemo(() => {
    const result = new Map<string, MemberMapHold[]>();
    for (const hold of holds) {
      const state = selectedRoute ? selectedIds.has(hold.id) ? "selected" : "dim" : "normal";
      const key = `${hold.category}:${state}`;
      result.set(key, [...(result.get(key) ?? []), hold]);
    }
    return [...result.entries()];
  }, [holds, selectedIds, selectedRoute]);
  return <group>{groups.map(([key, group]) => <HoldGroup face={face} group={group} key={key} lowQuality={lowQuality} onSelectRoute={onSelectRoute} routesByHold={routesByHold} selectedRoute={selectedRoute} state={key.split(":")[1] as "selected" | "dim" | "normal"} structure={structure}/>)}</group>;
}

function HoldGroup({ structure, face, group, routesByHold, selectedRoute, onSelectRoute, state, lowQuality }: { structure: MemberMapStructure; face: MemberMapFace; group: MemberMapHold[]; routesByHold: Map<string, MemberMapRoute[]>; selectedRoute: MemberMapRoute | null; onSelectRoute: (id: string) => void; state: "selected"|"dim"|"normal"; lowQuality:boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => holdGeometry(group[0].category), [group]);
  const basis = useMemo(() => structureBasis({ start: structure.start, end: structure.end }, face.facingDirection), [face.facingDirection, structure.end, structure.start]);
  const { invalidate } = useThree();
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    if (!mesh.current) return;
    const angle = face.angleDegrees * Math.PI / 180;
    const up = new THREE.Vector3(0, Math.cos(angle), 0).add(toThree(basis.outward).multiplyScalar(Math.sin(angle))).normalize();
    const normal = new THREE.Vector3().crossVectors(toThree(basis.tangent), up).normalize();
    const rotationBasis = new THREE.Matrix4().makeBasis(toThree(basis.tangent), up, normal);
    const baseQuaternion = new THREE.Quaternion().setFromRotationMatrix(rotationBasis);
    const matrix = new THREE.Matrix4();
    group.forEach((hold, index) => {
      const geometryFace={ widthMetres: face.widthMetres, heightMetres: face.heightMetres, angleDegrees: face.angleDegrees, surfaceKind:face.surfaceKind,vertices:face.vertices,facingDirection: face.facingDirection, localOffset: face.localOffset };
      const point = surfacePoint({ start: structure.start, end: structure.end, baseElevationMetres: structure.baseElevationMetres }, geometryFace, { u: hold.position.x, v: hold.position.y, depth: surfaceDepthAt(geometryFace,hold.position.x,hold.position.y)+0.04 });
      const spin = new THREE.Quaternion().setFromAxisAngle(normal, hold.rotationDegrees * Math.PI / 180);
      const quaternion = baseQuaternion.clone().premultiply(spin);
      const categoryScale = hold.category === "volume" ? 1.8 : hold.category === "macro" ? 1.35 : hold.category === "foothold" ? 0.65 : 1;
      const scale = Math.max(0.15, hold.scaleFactor * categoryScale * (state === "selected" ? 1.22 : 1));
      matrix.compose(toThree(point), quaternion, new THREE.Vector3(scale, scale, state === "selected" ? scale * 1.2 : scale));
      mesh.current!.setMatrixAt(index, matrix);
      const colour = state === "dim" ? "#78716c" : selectedRoute && state === "selected" ? routeColour(selectedRoute.colour) : hold.colour;
      mesh.current!.setColorAt(index, new THREE.Color(colour));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    invalidate();
  }, [basis, face, group, invalidate, selectedRoute, state, structure]);
  const select = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const hold = event.instanceId === undefined ? null : group[event.instanceId];
    const route = hold ? routesByHold.get(hold.id)?.[0] : null;
    if (route) onSelectRoute(route.id);
  };
  return <instancedMesh args={[geometry, undefined, group.length]} castShadow={!lowQuality} frustumCulled onClick={select} ref={mesh}>
    <meshStandardMaterial metalness={0.02} opacity={state === "dim" ? 0.14 : 1} roughness={0.62} transparent={state === "dim"} vertexColors/>
  </instancedMesh>;
}

function CameraRig({ bounds, command, selected }: { bounds: Bounds3; command: CameraCommand; selected: ReturnType<typeof faceGeometry> | null }) {
  const controls = useRef<ComponentRef<typeof CameraControls>>(null);
  const { size } = useThree();
  useEffect(() => {
    const selectedBounds=selected?boundsFromPoints(selected.vertices):null;
    const frame = frameBounds(selectedBounds ?? bounds, size.width / Math.max(1, size.height));
    const target = selected?.centre ?? frame.target;
    const distance = selected ? Math.max(4, frame.distance * 1.15) : frame.distance;
    const normal = selected?.normal ?? { x: 0.65, y: 0.35, z: 0.65 };
    const position = command.view === "top" ? { x: target.x, y: target.y + distance, z: target.z + 0.01 }
      : command.view === "front" ? { x: target.x + normal.x * distance, y: target.y + Math.max(0.3, normal.y * distance), z: target.z + normal.z * distance }
      : { x: target.x + distance * 0.72, y: target.y + distance * 0.52, z: target.z + distance * 0.72 };
    void controls.current?.setLookAt(position.x, position.y, position.z, target.x, target.y, target.z, true);
  }, [bounds, command, selected, size.height, size.width]);
  return <CameraControls dollyToCursor makeDefault maxDistance={Math.max(40, frameBounds(bounds).distance * 3)} maxPolarAngle={Math.PI / 2.02} minDistance={1.5} ref={controls} smoothTime={0.45}/>
}

function PerformanceProbe({ visible }: { visible: boolean }) {
  const { gl } = useThree();
  const [metrics, setMetrics] = useState({ calls: 0, triangles: 0 });
  const previous = useRef(0);
  useFrame(({ clock }) => {
    if (!visible || clock.elapsedTime - previous.current < 1) return;
    previous.current = clock.elapsedTime;
    setMetrics({ calls: gl.info.render.calls, triangles: gl.info.render.triangles });
  });
  return visible ? <Html fullscreen pointerEvents="none"><output className="absolute bottom-4 left-4 rounded-[var(--radius-md)] bg-stone-950/85 px-3 py-2 text-xs font-bold text-white">{metrics.calls} draw calls · {metrics.triangles.toLocaleString()} triangles</output></Html> : null;
}

function GymScene({ structures, selectedFaceId, detail, selectedRoute, onSelectFace, onSelectRoute, command, lowQuality, showMetrics }: { structures:MemberMapStructure[];selectedFaceId:string|null;detail:MemberFaceDetail|null;selectedRoute:MemberMapRoute|null;onSelectFace:(structure:MemberMapStructure,face:MemberMapFace)=>void;onSelectRoute:(id:string)=>void;command:CameraCommand;lowQuality:boolean;showMetrics:boolean }) {
  const surfaces = useMemo(() => structures.flatMap((structure) => structure.faces.map((face) => ({ structure, face, surface: faceGeometry(structure, face) }))), [structures]);
  const bounds = useMemo(() => boundsFromPoints(surfaces.flatMap(({ surface }) => surface.vertices)), [surfaces]);
  const selectedEntry = surfaces.find(({ face }) => face.id === selectedFaceId) ?? null;
  return <>
    <color args={["#f2f0eb"]} attach="background"/><fog args={["#f2f0eb", Math.max(50, frameBounds(bounds).distance * 1.7), Math.max(90, frameBounds(bounds).distance * 3.5)]} attach="fog"/>
    <ambientLight intensity={1.35}/><hemisphereLight color="#ffffff" groundColor="#a8a29e" intensity={1.5}/><directionalLight castShadow={!lowQuality} intensity={2.2} position={[18, 28, 14]} shadow-mapSize-height={lowQuality ? 512 : 1536} shadow-mapSize-width={lowQuality ? 512 : 1536}/>
    {structures.map((structure) => <group key={structure.id}><StructureBacking selected={structure.faces.some(({ id }) => id === selectedFaceId)} structure={structure}/>{structure.faces.map((face) => <FaceSurface face={face} key={face.id} onSelect={() => onSelectFace(structure, face)} selected={face.id === selectedFaceId} structure={structure}/>)}</group>)}
    {selectedEntry && detail?.status === "success" ? <HoldInstances face={selectedEntry.face} holds={detail.holds} lowQuality={lowQuality} onSelectRoute={onSelectRoute} routes={detail.routes} selectedRoute={selectedRoute} structure={selectedEntry.structure}/> : null}
    <Grid args={[Math.max(40, bounds.max.x - bounds.min.x + 20), Math.max(40, bounds.max.z - bounds.min.z + 20)]} cellColor="#d6d3d1" cellSize={1} cellThickness={0.45} fadeDistance={80} fadeStrength={1} infiniteGrid position={[0, -0.015, 0]} sectionColor="#a8a29e" sectionSize={5}/>
    {!lowQuality ? <ContactShadows blur={2.5} far={80} opacity={0.3} position={[0, 0, 0]} resolution={1024} scale={100}/> : null}
    <CameraRig bounds={bounds} command={command} selected={selectedEntry?.surface ?? null}/><PerformanceProbe visible={showMetrics}/>
  </>;
}

function formatDate(value: string) { return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00Z`)) : "Not set"; }

function RoutePanel({ gymSlug, route, sessions }: { gymSlug:string;route:MemberMapRoute;sessions:{id:string;session_date:string}[] }) {
  return <div className="space-y-5"><div><div className="flex items-center gap-3"><span aria-hidden="true" className="size-5 rounded-full border-2 border-white shadow" style={{backgroundColor:routeColour(route.colour)}}/><h3 className="text-2xl font-black">{route.name}</h3></div><p className="mt-1 font-bold text-[var(--muted)]">{route.grade} {route.gradeSystem} · {route.discipline.replaceAll("_"," ")}</p><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="font-bold text-[var(--muted)]">Setter</dt><dd>{route.setterName}</dd></div><div><dt className="font-bold text-[var(--muted)]">Set on</dt><dd>{formatDate(route.setOn)}</dd></div><div><dt className="font-bold text-[var(--muted)]">Holds</dt><dd>{route.holdIds.length}</dd></div></dl>{route.description?<p className="mt-4 text-sm leading-6">{route.description}</p>:null}</div><details className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4"><summary className="cursor-pointer font-black">Log an ascent</summary><div className="mt-4"><AscentForm gymSlug={gymSlug} routeId={route.id} sessions={sessions}/></div></details><RouteFeedbackControls favourite={route.favourite} gymSlug={gymSlug} routeId={route.id} submitted={route.submittedFeedback}/></div>;
}

export function MemberGym3D({ gymSlug, gymName, role, structures }: MemberGymExperienceProps) {
  const [selected, setSelected] = useState<{structure:MemberMapStructure;face:MemberMapFace}|null>(null);
  const [detail, setDetail] = useState<MemberFaceDetail|null>(null);
  const [selectedRouteId,setSelectedRouteId]=useState<string|null>(null);
  const [filter,setFilter]=useState("");
  const [command,setCommand]=useState<CameraCommand>({id:0,view:"fit"});
  const [lowQuality,setLowQuality]=useState(false);
  const [showMetrics,setShowMetrics]=useState(false);
  const sequence=useRef(0);
  const selectedRoute=detail?.status==="success"?detail.routes.find(({id})=>id===selectedRouteId)??null:null;
  const filteredRoutes=detail?.status==="success"?detail.routes.filter((route)=>`${route.name} ${route.colour} ${route.grade} ${route.setterName} ${route.discipline}`.toLowerCase().includes(filter.toLowerCase())):[];
  useEffect(()=>{const query=window.matchMedia("(max-width: 640px), (prefers-reduced-motion: reduce)");const update=()=>setLowQuality(query.matches);update();query.addEventListener("change",update);return()=>query.removeEventListener("change",update);},[]);
  const selectFace=useCallback((structure:MemberMapStructure,face:MemberMapFace)=>{const current=++sequence.current;setSelected({structure,face});setDetail(null);setSelectedRouteId(null);setCommand(({id})=>({id:id+1,view:"front"}));startTransition(async()=>{try{const result=await loadMemberFaceAction({gymSlug,faceId:face.id});if(sequence.current===current)setDetail(result);}catch{if(sequence.current===current)setDetail({status:"error",message:"This wall could not be loaded. Try again."});}});},[gymSlug]);
  const camera=(view:CameraView)=>setCommand(({id})=>({id:id+1,view}));
  const staff=role!=="member";
  return <div className="mx-auto max-w-[110rem]"><header className="mb-4 flex flex-wrap items-end justify-between gap-4"><div><p className="app-eyebrow text-[var(--muted)]">{gymName} · Digital twin</p><h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Explore the gym in 3D</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Drag to orbit, pinch or scroll to zoom, and choose a wall marker to see its climbs.</p></div>{staff?<Link className={buttonStyles()} href={role==="owner"?`/g/${gymSlug}/staff/floorplan`:`/g/${gymSlug}/staff/routes`}>Open editing tools</Link>:null}</header>
    {!structures.length?<section className="grid min-h-64 place-items-center rounded-[var(--radius-panel)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)] p-8 text-center"><div><h2 className="text-2xl font-black">The digital gym is being prepared</h2><p className="mt-2 text-sm text-[var(--muted)]">There are no published walls to explore yet.</p></div></section>:<div className={`grid min-h-[40rem] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface)] shadow-sm ${selected?"xl:grid-cols-[minmax(0,1fr)_25rem]":""}`}>
      <section className="relative min-h-[68vh] overflow-hidden bg-[#f2f0eb]" aria-label="Interactive three-dimensional gym">
        <div className="absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/95 p-2 shadow-lg" role="toolbar" aria-label="3D camera controls">{(["fit","reset","top","front","perspective"] as CameraView[]).map((view)=><Button aria-label={`${view} camera view`} className="min-h-10 px-3 capitalize" key={view} onClick={()=>camera(view)} variant="secondary">{view}</Button>)}<Button aria-pressed={showMetrics} className="min-h-10 px-3" onClick={()=>setShowMetrics((value)=>!value)} variant="secondary">Performance</Button></div>
        <Canvas camera={{fov:42,near:0.05,far:1000,position:[20,16,20]}} dpr={lowQuality?[1,1.15]:[1,1.65]} frameloop="demand" gl={{antialias:!lowQuality,powerPreference:lowQuality?"low-power":"high-performance"}} shadows={!lowQuality}>
          <GymScene command={command} detail={detail} lowQuality={lowQuality} onSelectFace={selectFace} onSelectRoute={setSelectedRouteId} selectedFaceId={selected?.face.id??null} selectedRoute={selectedRoute} showMetrics={showMetrics} structures={structures}/>
        </Canvas>
        <p className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-stone-700 shadow">Orbit · zoom · select a wall marker</p>
      </section>
      {selected?<aside className="max-h-[75vh] overflow-y-auto border-t border-[var(--border)] bg-[var(--surface)] p-5 xl:max-h-[calc(100vh-9rem)] xl:border-l xl:border-t-0" aria-labelledby="focused-wall-heading"><div className="flex items-start justify-between gap-3"><div><p className="app-eyebrow text-[var(--muted)]">{selected.structure.name}</p><h2 className="mt-1 text-2xl font-black" id="focused-wall-heading">{selected.face.name}</h2><p className="mt-1 text-sm text-[var(--muted)]">{selected.face.widthMetres.toFixed(1)} × {selected.face.heightMetres.toFixed(1)} m · {selected.face.angleDegrees}°</p></div><Button aria-label="Close focused wall" onClick={()=>{setSelected(null);setDetail(null);setSelectedRouteId(null);camera("fit");}} variant="icon">×</Button></div>
        {detail===null?<p aria-live="polite" className="mt-5 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-4 text-sm font-bold text-[var(--muted)]">Loading holds and routes…</p>:detail.status==="error"?<div className="mt-5 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-800" role="alert"><strong>Wall unavailable</strong><p className="mt-1">{detail.message}</p><Button className="mt-3" onClick={()=>selectFace(selected.structure,selected.face)} variant="secondary">Try again</Button></div>:<><label className="mt-5 block text-sm font-bold">Filter routes<input className="mt-1 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 font-normal focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]" onChange={(event)=>setFilter(event.target.value)} placeholder="Colour, grade, setter…" type="search" value={filter}/></label><div className="mt-4 flex flex-wrap gap-2">{filteredRoutes.map((route)=><Button aria-pressed={route.id===selectedRouteId} className={route.id===selectedRouteId?"ring-2 ring-[var(--focus-ring)]":""} key={route.id} onClick={()=>setSelectedRouteId(route.id)} variant="secondary"><span aria-hidden="true" className="mr-2 size-3 rounded-full" style={{backgroundColor:routeColour(route.colour)}}/>{route.name} · {route.grade}</Button>)}</div>{!filteredRoutes.length?<p className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted)]">No active routes match this filter.</p>:null}{selectedRoute?<div className="mt-6 border-t border-[var(--border)] pt-5"><RoutePanel gymSlug={gymSlug} route={selectedRoute} sessions={detail.sessions}/></div>:<p className="mt-5 text-sm text-[var(--muted)]">Choose a route to highlight only its holds and open climb details.</p>}</>}
      </aside>:null}
    </div>}
  </div>;
}

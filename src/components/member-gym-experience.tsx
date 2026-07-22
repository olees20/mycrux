"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { MemberMapConfiguration, MemberMapStructure } from "@/features/floorplan/member-map";
import type { GymRole } from "@/lib/supabase/types";

export type MemberGymExperienceProps = {
  gymSlug: string;
  gymName: string;
  role: GymRole;
  configuration: MemberMapConfiguration;
  structures: MemberMapStructure[];
};

const DigitalTwin = dynamic(() => import("@/components/member-gym-3d").then((module) => module.MemberGym3D), {
  ssr: false,
  loading: () => <div aria-live="polite" className="grid min-h-[36rem] place-items-center rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-subtle)]"><p className="font-bold text-[var(--muted)]">Preparing the 3D gym…</p></div>,
});

function AccessibleGymList({ gymSlug, role, structures }: Pick<MemberGymExperienceProps, "gymSlug" | "role" | "structures">) {
  const staff = role !== "member";
  return <section className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface)] p-6" aria-labelledby="simple-gym-heading">
    <p className="app-eyebrow text-[var(--muted)]">Simplified gym view</p>
    <h2 className="mt-2 text-2xl font-black" id="simple-gym-heading">Explore climbing walls</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Interactive 3D is unavailable in this browser. You can still review every wall and its available climbing faces.</p>
    {structures.length ? <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{structures.map((structure) => <li className="rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] p-4" key={structure.id}><h3 className="font-black">{structure.name}</h3><p className="mt-1 text-sm text-[var(--muted)]">{structure.faces.length} climbing {structure.faces.length === 1 ? "face" : "faces"}</p><ul className="mt-3 space-y-1 text-sm">{structure.faces.map((face) => <li key={face.id}>{face.name} · {face.angleDegrees}° · {face.routeCount} routes</li>)}</ul></li>)}</ul> : <p className="mt-5 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted)]">The gym team has not published any walls yet.</p>}
    {staff ? <Link className="mt-5 inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)]" href={role === "owner" ? `/g/${gymSlug}/staff/floorplan` : `/g/${gymSlug}/staff/routes`}>Open editing tools</Link> : null}
  </section>;
}

export function MemberGymExperience(props: MemberGymExperienceProps) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => {
    const frame=window.requestAnimationFrame(()=>{
      try {
        const canvas = document.createElement("canvas");
        setWebgl(Boolean(canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) || canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true })));
      } catch { setWebgl(false); }
    });
    return()=>window.cancelAnimationFrame(frame);
  }, []);
  if (webgl === null) return <div aria-live="polite" className="grid min-h-[36rem] place-items-center rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-subtle)]"><p className="font-bold text-[var(--muted)]">Checking 3D support…</p></div>;
  if (!webgl) return <AccessibleGymList gymSlug={props.gymSlug} role={props.role} structures={props.structures}/>;
  return <DigitalTwin {...props}/>;
}

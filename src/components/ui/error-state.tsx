"use client";

import { useEffect, useRef } from "react";
import { Button } from "./button";

export function ErrorState({ title, description, reset, reference }: { title: string; description: string; reset: () => void; reference?: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return <section className="mx-auto max-w-xl rounded-[var(--radius-panel)] border border-red-200 bg-[var(--destructive-surface)] p-5 sm:p-7" role="alert"><p className="app-eyebrow text-[var(--destructive)]">Unable to load</p><h1 className="mt-2 text-2xl font-extrabold tracking-[-.03em] outline-none" ref={heading} tabIndex={-1}>{title}</h1><p className="mt-3 text-sm leading-6 text-red-950">{description}</p>{reference ? <p className="mt-2 break-all text-xs text-red-800">Support reference: {reference}</p> : null}<Button className="mt-5" onClick={reset} type="button" variant="destructive">Try again</Button></section>;
}

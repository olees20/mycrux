"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { buttonStyles } from "@/components/ui/button";

export default function OnboardingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <section className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-[var(--surface)] p-7 sm:p-10">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-700">Something went wrong</p>
      <h1 className="mt-3 text-3xl font-black outline-none" ref={heading} tabIndex={-1}>We could not load your gym options</h1>
      <p className="mt-4 leading-7 text-[var(--muted)]">Your account has not been changed. Retry the membership check, or return later if the service is unavailable.</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <button className={buttonStyles()} onClick={reset} type="button">Try again</button>
        <Link className={buttonStyles({ variant: "secondary" })} href="/">Return home</Link>
      </div>
    </section>
  );
}

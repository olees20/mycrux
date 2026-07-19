import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function MarketingPage() {
  return (
    <section className="mx-auto grid min-h-[75vh] max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-[1.2fr_0.8fr]">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Your gym, connected</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-8xl">Climb more. Together.</h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">Routes, events and community in one accessible home for every climbing gym.</p>
        <Link className={buttonStyles({ className: "mt-8 min-h-12 px-6 text-base font-bold" })} href="/register">Create your account</Link>
      </div>
      <div aria-hidden="true" className="aspect-square rounded-[3rem] bg-[var(--accent)] p-8 shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)]">
        <div className="h-full rounded-[2rem] border-2 border-dashed border-black/25" />
      </div>
    </section>
  );
}

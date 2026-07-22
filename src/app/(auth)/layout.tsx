import Link from "next/link";
import { SkipLink } from "@/components/skip-link";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="grid min-h-screen grid-cols-1 bg-[var(--page)] lg:grid-cols-[minmax(20rem,.9fr)_minmax(28rem,1.1fr)]" id="main-content" tabIndex={-1}>
      <SkipLink />
      <section className="hidden bg-[var(--primary)] p-12 text-white lg:flex lg:flex-col lg:justify-between"><Link className="text-xl font-extrabold tracking-[-.03em]" href="/">MyCrux</Link><div><p className="app-eyebrow !text-lime-200">Your gym, mapped</p><p className="mt-4 max-w-lg text-5xl font-extrabold leading-[1.02] tracking-[-.05em]">Find the wall. Choose the route. Start climbing.</p></div><p className="text-sm text-white/70">A shared digital twin for climbers and gym teams.</p></section>
      <div className="grid min-h-screen place-items-center p-4 sm:p-8"><div className="w-full max-w-md"><Link className="mb-7 flex items-center justify-center gap-2 text-lg font-extrabold lg:hidden" href="/"><span className="grid size-8 place-items-center rounded-[.6rem] bg-[var(--primary)] text-[.65rem] text-white">MC</span>MyCrux</Link>
        {children}
      </div></div>
    </main>
  );
}

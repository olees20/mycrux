export default function GymSetupLoading() {
  return <div aria-busy="true" aria-live="polite" className="mx-auto max-w-5xl"><p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Loading gym setup</p><div className="mt-4 h-12 max-w-xl animate-pulse rounded-2xl bg-stone-200" /><div className="mt-8 h-96 animate-pulse rounded-3xl bg-stone-100" /></div>;
}


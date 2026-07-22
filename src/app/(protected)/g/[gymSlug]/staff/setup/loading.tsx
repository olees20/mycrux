export default function GymSetupLoading() {
  return <div aria-busy="true" aria-live="polite" className="mx-auto max-w-5xl"><p className="app-eyebrow text-[var(--muted)]">Loading gym setup</p><div className="mt-4 h-12 max-w-xl animate-pulse rounded-[var(--radius-lg)] bg-[var(--canvas)]" /><div className="mt-8 h-96 animate-pulse rounded-[var(--radius-panel)] bg-[var(--surface-subtle)]" /></div>;
}


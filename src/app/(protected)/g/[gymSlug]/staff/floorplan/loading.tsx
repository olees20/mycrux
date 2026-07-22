export default function FloorplanLoading() {
  return <div className="mx-auto max-w-[100rem] animate-pulse" aria-live="polite"><div className="h-10 w-72 rounded bg-[var(--canvas)]"/><div className="mt-6 h-[65vh] rounded-[var(--radius-panel)] bg-[var(--canvas)]"/><span className="sr-only">Loading floorplan editor…</span></div>;
}

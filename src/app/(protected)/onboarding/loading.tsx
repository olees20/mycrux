export default function OnboardingLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your onboarding options</span>
      <div className="h-4 w-28 animate-pulse rounded bg-[var(--border)]" />
      <div className="mt-4 h-12 max-w-xl animate-pulse rounded-2xl bg-[var(--border)]" />
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {[0, 1].map((item) => <div className="h-72 animate-pulse rounded-3xl bg-[var(--surface)]" key={item} />)}
      </div>
    </div>
  );
}

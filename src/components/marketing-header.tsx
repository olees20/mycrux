import Link from "next/link";

export function MarketingHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
      <Link className="text-xl font-black tracking-tight" href="/">CRUX</Link>
      <nav aria-label="Public navigation" className="flex items-center gap-3">
        <Link className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-white" href="/login">Sign in</Link>
        <Link className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white" href="/register">Join</Link>
      </nav>
    </header>
  );
}

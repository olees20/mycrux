import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="mx-auto flex max-w-[var(--content)] items-center justify-between px-5 py-5">
      <Link className="text-xl font-black tracking-tight" href="/">CRUX</Link>
      <nav aria-label="Public navigation" className="flex items-center gap-3">
        <Link className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold hover:bg-[var(--surface)]" href="/login">Sign in</Link>
        <Link className={buttonStyles({ className: "min-h-10 px-4 py-2" })} href="/register">Join</Link>
      </nav>
    </header>
  );
}

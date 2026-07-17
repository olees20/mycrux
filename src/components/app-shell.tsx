import Link from "next/link";

const navItems = [
  ["Home", "/app"], ["Routes", "/app/routes"], ["Community", "/app/community"],
  ["Events", "/app/events"], ["Profile", "/app/profile"],
] as const;

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] p-4 md:min-h-screen md:border-b-0 md:border-r">
        <div className="flex items-center justify-between md:block">
          <Link className="text-xl font-black tracking-tight" href="/app">CRUX</Link>
          <Link className="rounded-full bg-[var(--accent)] px-3 py-2 text-xs font-bold" href="/staff">Staff area</Link>
        </div>
        <nav aria-label="Member navigation" className="mt-4 flex gap-1 overflow-x-auto md:flex-col">
          {navItems.map(([label, href]) => (
            <Link className="min-h-11 whitespace-nowrap rounded-lg px-3 py-3 text-sm font-semibold hover:bg-stone-100" href={href} key={href}>{label}</Link>
          ))}
        </nav>
      </header>
      <main className="p-5 md:p-10">{children}</main>
    </div>
  );
}

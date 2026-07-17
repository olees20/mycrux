import Link from "next/link";
import { logoutAction } from "@/features/auth/actions";
import type { AccessibleGym } from "@/lib/server/gym-context-core";
import { GymSwitcher } from "./gym-switcher";

const navItems = [
  ["Home", ""], ["Routes", "/routes"], ["Community", "/community"],
  ["Events", "/events"], ["Profile", "/profile"],
] as const;

export function AppShell({ children, gym, gyms }: Readonly<{
  children: React.ReactNode;
  gym: AccessibleGym;
  gyms: readonly AccessibleGym[];
}>) {
  const memberBase = `/g/${gym.slug}/app`;
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] p-4 md:min-h-screen md:border-b-0 md:border-r">
        <div className="flex items-center justify-between md:block">
          <Link className="text-xl font-black tracking-tight" href={memberBase}>CRUX</Link>
          <div className="flex items-center gap-2">
            {gym.role !== "member" ? <Link className="rounded-full bg-[var(--accent)] px-3 py-2 text-xs font-bold" href={`/g/${gym.slug}/staff`}>Staff area</Link> : null}
            <form action={logoutAction}><button className="min-h-9 rounded-full px-3 text-xs font-bold hover:bg-stone-100">Sign out</button></form>
          </div>
        </div>
        <GymSwitcher activeGym={gym} gyms={gyms} />
        <nav aria-label="Member navigation" className="mt-4 flex gap-1 overflow-x-auto md:flex-col">
          {navItems.map(([label, href]) => (
            <Link className="min-h-11 whitespace-nowrap rounded-lg px-3 py-3 text-sm font-semibold hover:bg-stone-100" href={`${memberBase}${href}`} key={href}>{label}</Link>
          ))}
        </nav>
      </header>
      <main className="p-5 md:p-10">{children}</main>
    </div>
  );
}

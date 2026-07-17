import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { logoutAction } from "@/features/auth/actions";
import type { AccessibleGym } from "@/lib/server/gym-context-core";
import { GymSwitcher } from "./gym-switcher";

const navItems = [
  ["Home", ""], ["Routes", "/routes"], ["Community", "/community"], ["Partners", "/partners"],
  ["Events", "/events"], ["Announcements", "/announcements"],
  ["Notifications", "/notifications"], ["Logbook", "/logbook"], ["Statistics", "/statistics"], ["Leaderboards", "/leaderboards"], ["Wallet", "/wallet"], ["Waivers", "/waivers"], ["Guests", "/guests"], ["Profile", "/profile"],
] as const;

export function AppShell({ children, gym, gyms, branding }: Readonly<{
  children: React.ReactNode;
  gym: AccessibleGym;
  gyms: readonly AccessibleGym[];
  branding?: Readonly<{ primaryColour: string; accentColour: string; backgroundColour: string; accentForeground: string; logoUrl?: string }>;
}>) {
  const memberBase = `/g/${gym.slug}/app`;
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]" style={branding ? { "--foreground": branding.primaryColour, "--background": branding.backgroundColour, "--surface": branding.backgroundColour, "--accent": branding.accentColour, "--accent-foreground": branding.accentForeground } as CSSProperties : undefined}>
      <header className="border-b border-[var(--border)] bg-[var(--surface)] p-4 md:min-h-screen md:border-b-0 md:border-r">
        <div className="flex items-center justify-between md:block">
          <Link className="flex items-center gap-2 text-xl font-black tracking-tight" href={memberBase}>{branding?.logoUrl ? <Image alt={`${gym.name} logo`} className="h-9 w-auto object-contain" height={36} src={branding.logoUrl} unoptimized width={120} /> : "CRUX"}</Link>
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

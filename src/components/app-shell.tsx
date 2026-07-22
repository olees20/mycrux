import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { logoutAction } from "@/features/auth/actions";
import type { AccessibleGym } from "@/lib/server/gym-context-core";
import { buttonStyles } from "./ui/button";
import { GymSwitcher } from "./gym-switcher";
import { GymSearch } from "./gym-search";
import { MemberNavigation } from "./member-navigation";
import { SkipLink } from "./skip-link";

export function AppShell({ children, gym, gyms, branding, mode = "member", capabilities = [] }: Readonly<{
  children: React.ReactNode;
  gym: AccessibleGym;
  gyms: readonly AccessibleGym[];
  mode?: "member" | "staff";
  capabilities?: readonly string[];
  branding?: Readonly<{ primaryColour: string; accentColour: string; backgroundColour: string; accentForeground: string; logoUrl?: string }>;
}>) {
  const base = mode === "staff" ? `/g/${gym.slug}/staff` : `/g/${gym.slug}/app`;
  const switchDestination = mode === "staff" ? "/staff" : "/app";
  const availableGyms = mode === "staff" ? gyms.filter(({ role }) => role !== "member") : gyms;
  const style = branding ? { "--brand-primary": branding.primaryColour, "--brand-accent": branding.accentColour } as CSSProperties : undefined;
  return <div className="min-h-screen md:grid md:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]" style={style}>
    <SkipLink/>
    <aside className="hidden h-screen flex-col border-r border-[var(--border)] bg-[var(--sidebar)] p-4 md:sticky md:top-0 md:flex">
      <Link className="flex min-h-12 items-center gap-3 rounded-[var(--radius-md)] px-2 text-lg font-extrabold tracking-[-.03em]" href={base}>{branding?.logoUrl ? <Image alt={`${gym.name} logo`} className="h-8 w-auto max-w-32 object-contain" height={32} src={branding.logoUrl} unoptimized width={128}/> : <><span className="grid size-8 place-items-center rounded-[.6rem] bg-[var(--primary)] text-xs text-white">MC</span><span>MyCrux</span></>}</Link>
      <p className="mt-3 truncate px-2 text-xs font-semibold text-[var(--muted)]">{gym.name} · {mode === "staff" ? "Staff" : "Member"}</p>
      <GymSwitcher activeGym={gym} destination={switchDestination} gyms={availableGyms}/>
      <MemberNavigation capabilities={capabilities} memberBase={base} mode={mode} role={gym.role}/>
      <div className="mt-auto border-t border-[var(--border)] pt-3"><Link className={buttonStyles({ variant: "ghost", className: "w-full justify-start" })} href={mode === "staff" ? `/g/${gym.slug}/app` : gym.role !== "member" ? `/g/${gym.slug}/staff` : `/g/${gym.slug}/app/profile`}>{mode === "staff" ? "View as member" : gym.role !== "member" ? "Staff workspace" : "Account"}</Link><form action={logoutAction}><button className={buttonStyles({ variant: "ghost", className: "mt-1 w-full justify-start" })}>Sign out</button></form></div>
    </aside>
    <div className="min-w-0">
      <header className="sticky top-0 z-30 flex min-h-[var(--topbar-height)] items-center gap-3 border-b border-[var(--border)] bg-[var(--page)]/95 px-4 backdrop-blur md:px-6"><Link className="mr-auto flex items-center gap-2 font-extrabold tracking-[-.03em] md:hidden" href={base}><span className="grid size-8 place-items-center rounded-[.6rem] bg-[var(--primary)] text-[.65rem] text-white">MC</span><span className="max-w-32 truncate">{gym.name}</span></Link><div className="hidden w-full max-w-md md:block"><GymSearch gymSlug={gym.slug}/></div><div className="md:hidden"><MemberNavigation capabilities={capabilities} memberBase={base} mode={mode} role={gym.role}/></div></header>
      <main className="min-w-0 px-4 py-6 pb-24 sm:px-6 md:px-8 md:py-8 md:pb-10 xl:px-10" id="main-content" tabIndex={-1}>{children}</main>
    </div>
  </div>;
}

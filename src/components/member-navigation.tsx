"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  ["Home", ""], ["Routes", "/routes"], ["Community", "/community"], ["Chat", "/chat"], ["Partners", "/partners"],
  ["Events", "/events"], ["Competitions", "/competitions"], ["Announcements", "/announcements"],
  ["Notifications", "/notifications"], ["Logbook", "/logbook"], ["Statistics", "/statistics"], ["Leaderboards", "/leaderboards"], ["Wallet", "/wallet"], ["Waivers", "/waivers"], ["Guests", "/guests"], ["Profile", "/profile"],
] as const;

export function MemberNavigation({ memberBase }: { memberBase: string }) {
  const pathname = usePathname();
  return <nav aria-label="Member navigation" className="mt-4 flex gap-1 overflow-x-auto md:flex-col">
    {navItems.map(([label, suffix]) => {
      const href = `${memberBase}${suffix}`;
      const current = suffix ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href;
      return <Link aria-current={current ? "page" : undefined} className="min-h-11 whitespace-nowrap rounded-lg px-3 py-3 text-sm font-semibold hover:bg-stone-100 aria-[current=page]:bg-stone-100 aria-[current=page]:font-black" href={href} key={suffix}>{label}</Link>;
    })}
  </nav>;
}

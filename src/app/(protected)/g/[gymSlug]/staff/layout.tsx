import Link from "next/link";
import { GymSwitcher } from "@/components/gym-switcher";
import { GymSearch } from "@/components/gym-search";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { SkipLink } from "@/components/skip-link";

export default async function GymStaffLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ gymSlug: string }>;
}>) {
  const { gymSlug } = await params;
  const { gym, gyms } = await requireActiveGymContext({
    gymSlug,
    allowedRoles: ["owner", "staff", "route_setter"],
  });
  return <><SkipLink/><header className="border-b border-[var(--border)] bg-white px-5 py-4"><nav aria-label="Staff navigation"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-5"><Link className="font-black" href={`/g/${gym.slug}/staff`}>CRUX / STAFF</Link>{gym.role === "owner" ? <Link className="text-sm font-bold" href={`/g/${gym.slug}/staff/floorplan`}>Floorplan</Link> : null}<Link className="text-sm font-bold" href={`/g/${gym.slug}/staff/holds`}>Hold inventory</Link></div><Link className="text-sm font-bold" href={`/g/${gym.slug}/app`}>Member view</Link></div></nav><div className="max-w-md"><GymSwitcher activeGym={gym} destination="/staff" gyms={gyms.filter(({ role }) => role !== "member")} /><GymSearch gymSlug={gym.slug}/></div></header><main className="p-5 md:p-10" id="main-content" tabIndex={-1}>{children}</main></>;
}

import Link from "next/link";
import { GymSwitcher } from "@/components/gym-switcher";
import { requireActiveGymContext } from "@/lib/server/gym-context";

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
  return <><header className="border-b border-[var(--border)] bg-white px-5 py-4"><div className="flex items-center justify-between"><Link className="font-black" href={`/g/${gym.slug}/staff`}>CRUX / STAFF</Link><Link className="text-sm font-bold" href={`/g/${gym.slug}/app`}>Member view</Link></div><div className="max-w-md"><GymSwitcher activeGym={gym} destination="/staff" gyms={gyms.filter(({ role }) => role !== "member")} /></div></header><main className="p-5 md:p-10">{children}</main></>;
}

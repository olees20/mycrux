import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/server/platform-admin";

export default async function PlatformLayout({children}:{children:React.ReactNode}){await requirePlatformAdmin();return <div className="min-h-screen bg-stone-100 text-stone-950"><header className="border-b bg-white"><nav aria-label="Platform administration" className="mx-auto flex max-w-7xl items-center justify-between p-4"><Link className="text-xl font-black" href="/platform">Crux platform</Link><Link className="rounded-lg border px-3 py-2 text-sm font-bold" href="/platform/gyms/new">Create gym</Link></nav></header>{children}</div>}

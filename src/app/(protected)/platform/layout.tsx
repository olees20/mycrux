import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/server/platform-admin";
import { SkipLink } from "@/components/skip-link";
import { buttonStyles } from "@/components/ui/button";

export default async function PlatformLayout({children}:{children:React.ReactNode}){await requirePlatformAdmin();return <div className="min-h-screen bg-[var(--page)]"><SkipLink/><header className="border-b border-[var(--border)] bg-[var(--surface)]"><nav aria-label="Platform administration" className="mx-auto flex min-h-16 max-w-[var(--content)] items-center justify-between gap-4 px-4 sm:px-6"><Link className="flex items-center gap-2 font-extrabold tracking-[-.03em]" href="/platform"><span className="grid size-8 place-items-center rounded-[.6rem] bg-[var(--primary)] text-[.65rem] text-white">MC</span>Platform</Link><Link className={buttonStyles({variant:"secondary"})} href="/platform/gyms/new">Create gym</Link></nav></header><div id="main-content" tabIndex={-1}>{children}</div></div>}

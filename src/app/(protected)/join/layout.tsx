import Link from "next/link";
import { logoutAction } from "@/features/auth/actions";
import { SkipLink } from "@/components/skip-link";

export default function JoinLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"><SkipLink/><header className="border-b border-[var(--border)] bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link className="text-xl font-black" href="/">CRUX</Link><form action={logoutAction}><button className="min-h-11 rounded-full border border-[var(--border)] px-4 text-sm font-bold">Sign out</button></form></div></header><main className="mx-auto max-w-3xl px-5 py-10 sm:py-16" id="main-content" tabIndex={-1}>{children}</main></div>;
}

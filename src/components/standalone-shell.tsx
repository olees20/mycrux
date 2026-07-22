import Link from "next/link";
import { logoutAction } from "@/features/auth/actions";
import { buttonStyles } from "./ui/button";
import { SkipLink } from "./skip-link";

export function StandaloneShell({ children, width = "wide", signedIn = true, label }: { children: React.ReactNode; width?: "compact" | "wide"; signedIn?: boolean; label?: string }) {
  return <div className="min-h-screen bg-[var(--page)]"><SkipLink/><header className="border-b border-[var(--border)] bg-[var(--surface)]"><div className="mx-auto flex min-h-16 max-w-[var(--content)] items-center justify-between gap-4 px-4 sm:px-6"><Link className="flex items-center gap-2 font-extrabold tracking-[-.03em]" href="/"><span className="grid size-8 place-items-center rounded-[.6rem] bg-[var(--primary)] text-[.65rem] text-white">MC</span><span>MyCrux</span>{label ? <span className="hidden text-sm font-medium text-[var(--muted)] sm:inline">/ {label}</span> : null}</Link>{signedIn ? <form action={logoutAction}><button className={buttonStyles({ variant: "ghost" })}>Sign out</button></form> : null}</div></header><main className={`mx-auto w-full px-4 py-8 sm:px-6 sm:py-12 ${width === "compact" ? "max-w-3xl" : "max-w-[var(--content)]"}`} id="main-content" tabIndex={-1}>{children}</main></div>;
}

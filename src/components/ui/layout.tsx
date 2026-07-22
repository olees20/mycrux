import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageContainer({ className, wide = false, ...props }: HTMLAttributes<HTMLDivElement> & { wide?: boolean }) {
  return <div className={cn(wide ? "app-container-wide" : "app-container", className)} {...props}/>;
}

export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return <header className={cn("flex flex-wrap items-end justify-between gap-5", className)}><div className="min-w-0">{eyebrow ? <p className="app-eyebrow">{eyebrow}</p> : null}<h1 className={cn("app-title", eyebrow && "mt-2")}>{title}</h1>{description ? <div className="app-subtitle mt-3">{description}</div> : null}</div>{actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}</header>;
}

export function SectionHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}><div><h2 className="text-xl font-bold tracking-[-.02em]">{title}</h2>{description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p> : null}</div>{action}</div>;
}

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("app-panel p-4 sm:p-5", className)} {...props}/>;
}

export function EmptyState({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return <div className={cn("app-empty", className)}><p className="font-semibold text-[var(--foreground)]">{title}</p>{description ? <p className="mt-1 leading-6">{description}</p> : null}{action ? <div className="mt-3">{action}</div> : null}</div>;
}

export function Alert({ title, children, tone = "info", className }: { title?: ReactNode; children: ReactNode; tone?: "info" | "success" | "warning" | "error"; className?: string }) {
  const styles = tone === "success" ? "border-emerald-200 bg-[var(--success-surface)] text-emerald-950" : tone === "warning" ? "border-amber-200 bg-[var(--warning-surface)] text-amber-950" : tone === "error" ? "border-red-200 bg-[var(--destructive-surface)] text-red-950" : "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--foreground)]";
  return <div className={cn("rounded-[var(--radius-lg)] border p-4 text-sm leading-6", styles, className)} role={tone === "error" ? "alert" : "status"}>{title ? <p className="font-bold">{title}</p> : null}<div className={title ? "mt-1" : undefined}>{children}</div></div>;
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("app-skeleton", className)} {...props}/>;
}

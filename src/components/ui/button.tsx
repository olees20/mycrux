import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "icon";

export function buttonStyles({
  className,
  variant = "primary",
}: {
  className?: string;
  variant?: ButtonVariant;
} = {}) {
  return cn(
    "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed aria-disabled:pointer-events-none",
    variant === "primary"
      ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] hover:text-[var(--primary-foreground)] active:bg-[var(--foreground)] active:text-white disabled:bg-[var(--border)] disabled:text-[var(--foreground)] aria-disabled:bg-[var(--border)] aria-disabled:text-[var(--foreground)]"
      : variant === "secondary"
        ? "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)] active:bg-[var(--border)] disabled:bg-[var(--border)] disabled:text-[var(--foreground)] aria-disabled:bg-[var(--border)] aria-disabled:text-[var(--foreground)]"
        : variant === "ghost"
          ? "bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-subtle)] active:bg-[var(--border)] disabled:text-[var(--muted)]"
          : variant === "destructive"
            ? "bg-[var(--destructive)] text-white hover:bg-red-900 active:bg-red-950 disabled:bg-[var(--border)] disabled:text-[var(--foreground)]"
            : "size-11 min-h-11 rounded-[var(--radius-md)] bg-transparent p-0 text-[var(--foreground)] hover:bg-[var(--surface-subtle)] active:bg-[var(--border)]",
    className,
  );
}

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      className={buttonStyles({ className, variant })}
      type={type}
      {...props}
    />
  );
}

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export type ButtonVariant = "primary" | "secondary";

export function buttonStyles({
  className,
  variant = "primary",
}: {
  className?: string;
  variant?: ButtonVariant;
} = {}) {
  return cn(
    "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)] focus-visible:ring-offset-2 disabled:cursor-not-allowed aria-disabled:pointer-events-none",
    variant === "primary"
      ? "bg-[var(--foreground)] text-[var(--surface)] hover:bg-[var(--accent-foreground)] hover:text-[var(--surface)] active:bg-black active:text-white disabled:bg-[var(--border)] disabled:text-[var(--foreground)] aria-disabled:bg-[var(--border)] aria-disabled:text-[var(--foreground)]"
      : "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--background)] active:bg-[var(--border)] disabled:bg-[var(--border)] disabled:text-[var(--foreground)] aria-disabled:bg-[var(--border)] aria-disabled:text-[var(--foreground)]",
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

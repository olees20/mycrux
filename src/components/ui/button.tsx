import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary"
          ? "bg-[var(--foreground)] text-white hover:opacity-85"
          : "border border-[var(--border)] bg-white hover:bg-stone-50",
        className,
      )}
      type={type}
      {...props}
    />
  );
}

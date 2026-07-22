import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control = "mt-1 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-[var(--foreground)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 disabled:bg-[var(--surface-subtle)] disabled:text-[var(--muted)]";

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className, ...props }, ref) { return <input className={cn(control, className)} ref={ref} {...props}/>; });
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) { return <select className={cn(control, className)} ref={ref} {...props}/>; });
export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ className, ...props }, ref) { return <textarea className={cn(control, "min-h-24 py-2", className)} ref={ref} {...props}/>; });

export function Checkbox({ label, description, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  return <label className={cn("flex min-h-11 items-start gap-3 rounded-[var(--radius-md)] px-2 py-2 text-sm", className)}><input className="mt-0.5 size-[1.125rem] accent-[var(--primary)]" type="checkbox" {...props}/><span><span className="block font-semibold">{label}</span>{description ? <span className="mt-0.5 block text-xs leading-5 text-[var(--muted)]">{description}</span> : null}</span></label>;
}

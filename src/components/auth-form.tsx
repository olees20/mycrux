"use client";

import Link from "next/link";
import { useActionState } from "react";
import { initialAuthActionState, type AuthActionState } from "@/features/auth/state";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/form-controls";

type AuthAction = (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;

export function AuthForm({
  action,
  mode,
  next,
}: {
  action: AuthAction;
  mode: "login" | "register" | "forgot" | "reset";
  next?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialAuthActionState);
  const copy = {
    login: { title: "Welcome back", submit: "Sign in" },
    register: { title: "Join your gym", submit: "Create account" },
    forgot: { title: "Reset your password", submit: "Send reset link" },
    reset: { title: "Choose a new password", submit: "Update password" },
  }[mode];

  return (
    <section className="app-panel p-6 sm:p-8">
      <p className="app-eyebrow">MyCrux account</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-.035em]">{copy.title}</h1>
      <form action={formAction} className="mt-7 space-y-5">
        {mode === "register" ? <Field autoComplete="name" label="Display name" name="displayName" /> : null}
        {mode !== "reset" ? <Field autoComplete="email" label="Email" name="email" type="email" /> : null}
        {mode === "login" || mode === "register" || mode === "reset" ? (
          <Field
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            label={mode === "reset" ? "New password" : "Password"}
            minLength={mode === "login" ? 1 : 12}
            name="password"
            type="password"
          />
        ) : null}
        {next ? <input name="next" type="hidden" value={next} /> : null}
        {state.message ? (
          <p aria-live="polite" className={state.status === "error" ? "text-sm text-red-700" : "text-sm text-green-800"}>
            {state.message}
          </p>
        ) : null}
        <Button className="min-h-12 w-full" disabled={pending} type="submit">
          {pending ? "Working…" : copy.submit}
        </Button>
      </form>
      {mode === "login" ? (
        <div className="mt-6 flex justify-between text-sm"><Link className="font-bold underline" href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}>Create account</Link><Link className="underline" href="/forgot-password">Forgot password?</Link></div>
      ) : null}
      {mode === "register" ? <p className="mt-6 text-sm">Already registered? <Link className="font-bold underline" href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>Sign in</Link></p> : null}
      {mode === "forgot" ? <p className="mt-6 text-sm"><Link className="font-bold underline" href="/login">Back to sign in</Link></p> : null}
    </section>
  );
}

function Field({ label, name, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <TextInput className="mt-2 min-h-12 px-4 font-normal" name={name} required {...props} />
    </label>
  );
}

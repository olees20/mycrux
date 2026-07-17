import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AuthPlaceholder({ mode }: { mode: "login" | "register" }) {
  const login = mode === "login";
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-white p-7 shadow-sm">
      <h1 className="text-3xl font-black">{login ? "Welcome back" : "Join your gym"}</h1>
      <p className="mt-3 leading-7 text-[var(--muted)]">Authentication will be connected to Supabase during the dedicated auth stage.</p>
      <Button className="mt-7 w-full" disabled>{login ? "Sign in" : "Create account"}</Button>
      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        {login ? "New to Crux? " : "Already registered? "}
        <Link className="font-bold underline" href={login ? "/register" : "/login"}>{login ? "Create an account" : "Sign in"}</Link>
      </p>
    </section>
  );
}

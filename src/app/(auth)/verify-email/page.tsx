import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-white p-7 text-center shadow-sm">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--muted)]">One more move</p>
      <h1 className="mt-3 text-3xl font-black">Check your email</h1>
      <p className="mt-4 leading-7 text-[var(--muted)]">Use the verification link we sent before joining a gym. The link can be requested again through registration if it expires.</p>
      <Link className="mt-7 inline-flex min-h-11 items-center rounded-full bg-[var(--foreground)] px-5 font-bold text-white" href="/login">Back to sign in</Link>
    </section>
  );
}

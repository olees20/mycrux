import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export function OnboardingChoices() {
  return (
    <div className="mt-10 grid gap-5 md:grid-cols-2">
      <article className="flex flex-col rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent)] text-2xl font-black">+</span>
        <h2 className="mt-6 text-2xl font-black">Create a gym</h2>
        <p className="mt-3 flex-1 leading-7 text-[var(--muted)]">
          For owners, managers, or staff setting up a new climbing organisation. You will become its initial owner.
        </p>
        <Link className={buttonStyles({ className: "mt-7 w-full sm:w-fit" })} href="/onboarding/create">
          Set up a new gym
        </Link>
      </article>

      <article className="flex flex-col rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent)] text-xl font-black">→</span>
        <h2 className="mt-6 text-2xl font-black">Join a gym</h2>
        <p className="mt-3 flex-1 leading-7 text-[var(--muted)]">
          Scan the member QR at your gym, or enter its short gym code as a fallback.
        </p>
        <a className={buttonStyles({ className: "mt-7 w-full sm:w-fit", variant: "secondary" })} href="#join-gym">
          Scan QR or enter code
        </a>
      </article>
    </div>
  );
}

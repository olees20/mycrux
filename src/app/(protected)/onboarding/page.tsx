import { redirect } from "next/navigation";
import { GymCodeEntry } from "@/components/gym-code-entry";
import { GymQrScanner } from "@/components/gym-qr-scanner";
import { OnboardingChoices } from "@/components/onboarding-choices";
import { requireUser } from "@/lib/server/authorization";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createServerComponentSupabaseClient();
  const user = await requireUser({ redirectTo: "/onboarding", client: supabase });

  const { data: existingMemberships, error: membershipError } = await supabase
    .from("gym_memberships")
    .select("id")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .limit(1);
  if (membershipError) throw new Error("Your gym memberships could not be checked.");
  const hasMembership = existingMemberships.length > 0;
  if (hasMembership) redirect("/app");

  return (
    <div>
      <div className="max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Get started</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Choose how to continue</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted)]">
          Your account is ready, but it is not connected to a gym yet. Set up an organisation or scan your gym’s member QR code.
        </p>
      </div>

      <OnboardingChoices />

      <section aria-labelledby="join-gym-heading" className="mt-12 scroll-mt-6" id="join-gym">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Member access</p>
          <h2 className="mt-2 text-3xl font-black" id="join-gym-heading">Scan or enter your gym code</h2>
          <p className="mt-3 leading-7 text-[var(--muted)]">
            The QR code and short code identify the gym. You will always confirm the gym before standard member access is created.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="text-xl font-black">Scan the member QR code</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use the QR displayed at your gym. You can also scan it with your phone’s normal camera.</p>
            <GymQrScanner />
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6"><h3 className="text-xl font-black">Enter the gym code</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use the eight-character code printed beside the gym’s QR.</p><GymCodeEntry /></div>
        </div>
      </section>
    </div>
  );
}

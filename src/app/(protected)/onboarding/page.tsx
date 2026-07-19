import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { InvitationForm, MembershipRequestButton } from "@/components/onboarding-actions";
import { OnboardingChoices } from "@/components/onboarding-choices";
import { requireUser } from "@/lib/server/authorization";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import type { InvitationLifecycleState } from "@/features/auth/invitations";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const supabase = await createServerComponentSupabaseClient();
  const user = await requireUser({ redirectTo: "/onboarding", client: supabase });
  if (!user.email_confirmed_at) redirect("/verify-email");

  const { data: existingMemberships, error: membershipError } = await supabase
    .from("gym_memberships")
    .select("id")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .limit(1);
  if (membershipError) throw new Error("Your gym memberships could not be checked.");
  const hasMembership = existingMemberships.length > 0;
  if (hasMembership && !token) redirect("/app");

  let invitationStatus: { state: InvitationLifecycleState; gymName?: string | null; role?: string | null } | undefined;
  if (token) {
    const tokenHash = createHash("sha256").update(token.trim()).digest("hex");
    const { data: statuses, error: statusError } = await supabase.rpc("get_gym_invitation_status", { invitation_token_hash: tokenHash });
    if (statusError) throw new Error("The invitation status could not be checked.");
    const status = statuses?.[0];
    invitationStatus = status ? { state: status.state as InvitationLifecycleState, gymName: status.gym_name, role: status.invitation_role } : { state: "invalid" };
  }

  const { data: gyms, error: gymsError } = await supabase
    .from("gyms")
    .select("id, name, timezone")
    .eq("public_join_requests_enabled", true)
    .in("status", ["trial", "active"])
    .is("archived_at", null)
    .order("name");
  if (gymsError) throw new Error("Available gyms could not be loaded.");

  return (
    <div>
      <div className="max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--muted)]">{hasMembership ? "Gym invitation" : "Get started"}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{hasMembership ? "Accept your invitation" : "Choose how to continue"}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted)]">
          {hasMembership ? "You already have gym access. Accepting this email-bound invitation will add the invited gym to your account." : "Your account is ready, but it is not connected to a gym yet. Set up an organisation or join an existing gym."}
        </p>
      </div>

      {hasMembership ? null : <OnboardingChoices />}

      <section aria-labelledby="join-gym-heading" className="mt-12 scroll-mt-6" id="join-gym">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Join an organisation</p>
          <h2 className="mt-2 text-3xl font-black" id="join-gym-heading">Connect to your gym</h2>
          <p className="mt-3 leading-7 text-[var(--muted)]">
            Invitation links fill the code automatically. You can also paste the code your gym sent you.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className={`rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 ${hasMembership ? "lg:col-span-2" : ""}`}>
            <h3 className="text-xl font-black">Use an invitation or join code</h3>
            <InvitationForm status={invitationStatus} token={token} />
          </div>

          {hasMembership ? null : <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="text-xl font-black">Gyms accepting requests</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">No code? Ask a listed gym to approve your membership.</p>
            {gyms.length ? (
              <ul className="mt-5 space-y-3">
                {gyms.map((gym) => (
                  <li className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between" key={gym.id}>
                    <div><p className="font-bold">{gym.name}</p><p className="text-sm text-[var(--muted)]">{gym.timezone}</p></div>
                    <MembershipRequestButton gymId={gym.id} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-5 rounded-2xl bg-[var(--background)] p-5">
                <p className="font-bold">No public gyms found</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Ask your gym for an invitation or join code, then enter it here.</p>
              </div>
            )}
          </div>}
        </div>
      </section>
    </div>
  );
}

import { redirect } from "next/navigation";
import { InvitationForm, MembershipRequestButton } from "@/components/onboarding-actions";
import { requireRouteUser } from "@/lib/server/authorization";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createServerComponentSupabaseClient();
  const user = await requireRouteUser(supabase);
  if (!user.email_confirmed_at) redirect("/verify-email");

  const { data: existingMembership } = await supabase
    .from("gym_memberships")
    .select("id")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (existingMembership) redirect("/app");

  const { data: gyms } = await supabase
    .from("gyms")
    .select("id, name, timezone")
    .eq("public_join_requests_enabled", true)
    .in("status", ["trial", "active"])
    .is("archived_at", null)
    .order("name");

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-white p-7 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Choose your gym</p>
      <h1 className="mt-3 text-3xl font-black">Where do you climb?</h1>
      <p className="mt-3 leading-7 text-[var(--muted)]">Accept an invitation from your gym, or request access to a public gym.</p>
      <div className="mt-8 rounded-2xl bg-[var(--background)] p-5">
        <h2 className="font-bold">Have an invitation?</h2>
        <InvitationForm />
      </div>
      <div className="mt-8">
        <h2 className="text-xl font-black">Public gyms</h2>
        {gyms?.length ? (
          <ul className="mt-4 space-y-3">
            {gyms.map((gym) => (
              <li className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between" key={gym.id}>
                <div><p className="font-bold">{gym.name}</p><p className="text-sm text-[var(--muted)]">{gym.timezone}</p></div>
                <MembershipRequestButton gymId={gym.id} />
              </li>
            ))}
          </ul>
        ) : <p className="mt-4 text-sm text-[var(--muted)]">No gyms are currently accepting public requests.</p>}
      </div>
    </section>
  );
}

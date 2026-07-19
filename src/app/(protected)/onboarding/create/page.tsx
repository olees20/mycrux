import Link from "next/link";
import { redirect } from "next/navigation";
import { FirstGymForm } from "@/components/first-gym-form";
import { requireUser } from "@/lib/server/authorization";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export default async function CreateFirstGymPage() {
  const supabase = await createServerComponentSupabaseClient();
  const user = await requireUser({ redirectTo: "/onboarding/create", client: supabase });
  const { data: memberships, error } = await supabase
    .from("gym_memberships")
    .select("id")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .limit(1);
  if (error) throw new Error("Your gym creation eligibility could not be checked.");
  if (memberships.length) redirect("/app");

  return (
    <div className="mx-auto max-w-5xl">
      <Link className="font-bold underline decoration-2 underline-offset-4" href="/onboarding">← Back to your choices</Link>
      <p className="mt-8 text-sm font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Create a gym</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Set up your organisation</h1>
      <p className="mt-4 mb-8 max-w-3xl text-lg leading-8 text-[var(--muted)]">
        Start with the essentials. You will become the first owner and can finish branding, opening hours, routes, member access, billing, and team roles from the gym dashboard.
      </p>
      <FirstGymForm defaultEmail={user.email ?? ""} />
    </div>
  );
}

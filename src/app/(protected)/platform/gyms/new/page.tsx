import { notFound, redirect } from "next/navigation";
import { GymConfigurationForm } from "@/components/gym-configuration-form";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export default async function CreateGymPage() {
  const supabase = await createServerComponentSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login?next=/platform/gyms/new");
  if (!authData.user.email_confirmed_at) redirect("/verify-email");
  const { data: profile } = await supabase.from("profiles").select("is_platform_admin").eq("id", authData.user.id).single();
  if (!profile?.is_platform_admin) notFound();
  return <main className="mx-auto max-w-5xl p-5 md:p-10"><p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Platform onboarding</p><h1 className="mt-3 text-4xl font-black">Create a gym tenant</h1><p className="mt-3 mb-8 max-w-3xl text-[var(--muted)]">Configure the tenant, accessible brand palette, public visibility, and operating details. You will become its initial owner.</p><GymConfigurationForm mode="create" /></main>;
}

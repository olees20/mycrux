import Link from "next/link";
import { GymConfigurationForm, GymLogoForm } from "@/components/gym-configuration-form";
import { buttonStyles } from "@/components/ui/button";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export default async function GymSettingsPage({ params, searchParams }: { params: Promise<{ gymSlug: string }>; searchParams: Promise<{ created?: string }> }) {
  const { gymSlug } = await params;
  const created = (await searchParams).created === "1";
  const { gym } = await requireActiveGymContext({ gymSlug, allowedRoles: ["owner"] });
  const supabase = await createServerComponentSupabaseClient();
  const [{ data: details }, { data: branding }] = await Promise.all([
    supabase.from("gyms").select("name,slug,address_line_1,address_line_2,city,postcode,country_code,timezone,contact_email,contact_phone,disciplines,opening_hours_text,public_join_requests_enabled").eq("id", gym.id).single(),
    supabase.from("gym_branding").select("primary_colour,accent_colour,background_colour,welcome_message").eq("gym_id", gym.id).single(),
  ]);
  if (!details || !branding) return null;
  return <div className="mx-auto max-w-5xl">
    {created ? <section className="mb-8 rounded-[var(--radius-panel)] border border-green-200 bg-green-50 p-6" role="status"><p className="app-eyebrow text-green-800">Gym created</p><h1 className="mt-2 text-3xl font-black text-green-950">Welcome to {details.name}</h1><p className="mt-3 max-w-2xl leading-7 text-green-900">You are the gym owner. Complete the settings below, then publish member access or review your trial and billing options.</p><div className="mt-5 flex flex-wrap gap-3"><Link className={buttonStyles()} href={`/g/${gym.slug}/staff/member-access`}>Open member access</Link><Link className={buttonStyles({ variant: "secondary" })} href={`/g/${gym.slug}/staff/billing`}>Review billing</Link></div></section> : null}
    <p className="app-eyebrow text-[var(--muted)]">Owner settings</p>
    {created ? <h2 className="mt-3 text-4xl font-extrabold tracking-[-.035em]">Gym and branding</h2> : <h1 className="mt-3 text-4xl font-extrabold tracking-[-.035em]">Gym and branding</h1>}
    <p className="mt-3 mb-8 max-w-3xl text-[var(--muted)]">Slug changes are recorded and may break old links. Logo uploads are private and tenant-scoped.</p>
    <GymConfigurationForm mode="edit" values={{ name: details.name, slug: details.slug, addressLine1: details.address_line_1 ?? "", addressLine2: details.address_line_2 ?? "", city: details.city ?? "", postcode: details.postcode ?? "", countryCode: details.country_code, timezone: details.timezone, contactEmail: details.contact_email ?? "", contactPhone: details.contact_phone ?? "", disciplines: details.disciplines, openingHoursText: details.opening_hours_text ?? "", publicJoinRequestsEnabled: details.public_join_requests_enabled, primaryColour: branding.primary_colour, accentColour: branding.accent_colour, backgroundColour: branding.background_colour, welcomeMessage: branding.welcome_message ?? "" }} />
    <div className="mt-8"><GymLogoForm gymSlug={gym.slug} /></div>
  </div>;
}

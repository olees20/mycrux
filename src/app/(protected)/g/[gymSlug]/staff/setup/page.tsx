import Link from "next/link";
import { redirect } from "next/navigation";
import { GymLogoForm } from "@/components/gym-configuration-form";
import { SetupClimbingForm, SetupContinueForm, SetupDetailsForm, SetupLocationForm } from "@/components/gym-setup-forms";
import { WallForm } from "@/components/wall-form";
import { buttonStyles } from "@/components/ui/button";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

const steps = ["Details", "Location", "Climbing", "First area", "Team", "Finish"];

type RouteDefaults = { grade_systems?: string[]; default_route_type?: string; default_grade?: string };

function routeDefaults(settings: Json): RouteDefaults {
  if (!settings || Array.isArray(settings) || typeof settings !== "object") return {};
  const value = settings.route_defaults;
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return {
    grade_systems: Array.isArray(value.grade_systems) ? value.grade_systems.filter((item): item is string => typeof item === "string") : undefined,
    default_route_type: typeof value.default_route_type === "string" ? value.default_route_type : undefined,
    default_grade: typeof value.default_grade === "string" ? value.default_grade : undefined,
  };
}

export default async function GymSetupPage({ params, searchParams }: { params: Promise<{ gymSlug: string }>; searchParams: Promise<{ step?: string }> }) {
  const [{ gymSlug }, query] = await Promise.all([params, searchParams]);
  const { gym } = await requireActiveGymContext({ gymSlug, allowedRoles: ["owner"] });
  const supabase = await createServerComponentSupabaseClient();
  const [{ data: details, error: detailsError }, { data: branding, error: brandingError }, { data: walls }, { count: staffCount }] = await Promise.all([
    supabase.from("gyms").select("name,address_line_1,address_line_2,city,postcode,country_code,timezone,contact_email,contact_phone,disciplines,settings,setup_current_step,setup_completed_at").eq("id", gym.id).single(),
    supabase.from("gym_branding").select("logo_path,primary_colour,accent_colour,background_colour").eq("gym_id", gym.id).single(),
    supabase.from("walls").select("id,name,description,sort_order").eq("gym_id", gym.id).eq("is_active", true).is("archived_at", null).order("sort_order"),
    supabase.from("gym_memberships").select("id", { count: "exact", head: true }).eq("gym_id", gym.id).eq("status", "active").in("role", ["staff", "route_setter"]),
  ]);
  if (detailsError || brandingError || !details || !branding) throw new Error("Gym setup could not be loaded.");

  const requested = Number.parseInt(query.step ?? String(details.setup_current_step), 10);
  const step = Number.isInteger(requested) && requested >= 1 && requested <= 6 ? requested : details.setup_current_step;
  if (!details.setup_completed_at && step > details.setup_current_step) redirect(`/g/${gym.slug}/staff/setup?step=${details.setup_current_step}`);
  const defaults = routeDefaults(details.settings);
  const completed = details.setup_completed_at !== null;

  return <div className="mx-auto max-w-5xl pb-12">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--muted)]">First-time gym setup</p><h1 className="mt-2 text-4xl font-black">Make {gym.name} ready</h1><p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">Each step is saved separately. You can return to the dashboard and resume at any time.</p></div><Link className={buttonStyles({ variant: "secondary" })} href={`/g/${gym.slug}/staff`}>Save and leave</Link></div>

    <nav aria-label="Setup progress" className="mt-8 overflow-x-auto"><ol className="flex min-w-max gap-2">{steps.map((label, index) => { const number = index + 1; const available = completed || number <= details.setup_current_step; return <li key={label}>{available ? <Link aria-current={number === step ? "step" : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 ${number === step ? "border-black bg-black text-white" : "border-[var(--border)] bg-white"}`} href={`/g/${gym.slug}/staff/setup?step=${number}`}>{number}. {label}</Link> : <span aria-disabled="true" className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-4 text-sm font-bold opacity-45">{number}. {label}</span>}</li>; })}</ol></nav>

    <section className="mt-8 rounded-3xl border border-[var(--border)] bg-white p-5 sm:p-8">
      {step === 1 ? <><p className="text-sm font-bold uppercase text-[var(--muted)]">Step 1 of 6</p><h2 className="mt-2 text-3xl font-black">Details and branding</h2><p className="mt-2 mb-7 text-[var(--muted)]">Set the identity and contact details members will recognise.</p><SetupDetailsForm gymSlug={gym.slug} values={{ name: details.name, contactEmail: details.contact_email ?? "", contactPhone: details.contact_phone ?? "", primaryColour: branding.primary_colour, accentColour: branding.accent_colour, backgroundColour: branding.background_colour }} /><div className="mt-8 border-t border-[var(--border)] pt-7"><GymLogoForm gymSlug={gym.slug} /></div></> : null}
      {step === 2 ? <><p className="text-sm font-bold uppercase text-[var(--muted)]">Step 2 of 6</p><h2 className="mt-2 text-3xl font-black">Location</h2><p className="mt-2 mb-7 text-[var(--muted)]">The timezone controls operational dates, opening days, and dashboard reporting.</p><SetupLocationForm gymSlug={gym.slug} values={{ addressLine1: details.address_line_1 ?? "", addressLine2: details.address_line_2 ?? "", city: details.city ?? "", postcode: details.postcode ?? "", countryCode: details.country_code, timezone: details.timezone }} /></> : null}
      {step === 3 ? <><p className="text-sm font-bold uppercase text-[var(--muted)]">Step 3 of 6</p><h2 className="mt-2 text-3xl font-black">Climbing configuration</h2><p className="mt-2 mb-7 text-[var(--muted)]">These defaults speed up route entry; setters can still override them per climb.</p><SetupClimbingForm gymSlug={gym.slug} values={{ disciplines: details.disciplines, gradeSystems: defaults.grade_systems ?? ["Font"], defaultRouteType: defaults.default_route_type ?? "boulder", defaultGrade: defaults.default_grade ?? "6A" }} /></> : null}
      {step === 4 ? <><p className="text-sm font-bold uppercase text-[var(--muted)]">Step 4 of 6</p><h2 className="mt-2 text-3xl font-black">Create your first wall or area</h2><p className="mt-2 mb-7 text-[var(--muted)]">Routes belong to an existing wall, zone, or sector. Add at least one before continuing.</p><div className="space-y-4">{walls?.map((wall) => <div className="rounded-2xl bg-stone-50 p-4" key={wall.id}><WallForm gymSlug={gym.slug} wall={wall} /></div>)}<div className="rounded-2xl border border-dashed border-[var(--border)] p-4"><WallForm gymSlug={gym.slug} /></div></div><div className="mt-7"><SetupContinueForm gymSlug={gym.slug} step={4} /></div></> : null}
      {step === 5 ? <><p className="text-sm font-bold uppercase text-[var(--muted)]">Step 5 of 6</p><h2 className="mt-2 text-3xl font-black">Team and members</h2><p className="mt-2 text-[var(--muted)]">Open the member access page to print your QR and short gym code. Team members join normally first, then an owner or manager assigns their staff role.</p><Link className={`${buttonStyles()} mt-6`} href={`/g/${gym.slug}/staff/member-access`}>Open member access</Link><div className="mt-8 border-t border-[var(--border)] pt-7"><SetupContinueForm gymSlug={gym.slug} step={5}/></div></> : null}
      {step === 6 ? <><p className="text-sm font-bold uppercase text-[var(--muted)]">Step 6 of 6</p><h2 className="mt-2 text-3xl font-black">Ready to open CRUX</h2><p className="mt-2 text-[var(--muted)]">Review the minimum setup, then mark it complete.</p><dl className="mt-7 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-stone-50 p-5"><dt className="text-sm font-bold text-[var(--muted)]">Location</dt><dd className="mt-1 font-black">{details.city}, {details.country_code} · {details.timezone}</dd></div><div className="rounded-2xl bg-stone-50 p-5"><dt className="text-sm font-bold text-[var(--muted)]">Climbing</dt><dd className="mt-1 font-black">{details.disciplines.join(", ")}</dd></div><div className="rounded-2xl bg-stone-50 p-5"><dt className="text-sm font-bold text-[var(--muted)]">Areas</dt><dd className="mt-1 font-black">{walls?.length ?? 0} active</dd></div><div className="rounded-2xl bg-stone-50 p-5"><dt className="text-sm font-bold text-[var(--muted)]">Team</dt><dd className="mt-1 font-black">{staffCount ?? 0} additional staff member{staffCount === 1 ? "" : "s"}</dd></div></dl>{completed ? <div className="mt-7 rounded-2xl bg-emerald-50 p-5"><p className="font-black text-emerald-950">Setup is complete.</p><Link className={`${buttonStyles()} mt-4`} href={`/g/${gym.slug}/staff`}>Go to dashboard</Link></div> : <div className="mt-7"><SetupContinueForm complete gymSlug={gym.slug} step={6} /></div>}<aside className="mt-8 border-t border-[var(--border)] pt-7"><h3 className="font-black">Optional next steps</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]"><li>Print the member QR and place it near reception.</li><li>Create routes and upload a current wall image.</li><li>Review plans, billing, waivers, and day-pass registration.</li></ul></aside></> : null}
    </section>
  </div>;
}

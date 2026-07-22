import { notFound } from "next/navigation";
import { GuestRegistrationForm } from "@/components/guest-registration-form";
import { privilegedAccess } from "@/lib/supabase/admin";

export const revalidate = 300;

export default async function PublicDayPassPage({params}:{params:Promise<{gymSlug:string}>}){const{gymSlug}=await params;const gym=await privilegedAccess.getPublicDayPassGym(gymSlug);if(!gym)notFound();return <div className="mx-auto max-w-3xl py-10"><p className="app-eyebrow text-[var(--muted)]">{gym.name}</p><h1 className="mt-3 text-4xl font-extrabold tracking-[-.035em]">Register a day pass</h1><p className="mt-3 text-[var(--muted)]">Register before arrival, complete required waivers, then present the QR reference at reception. This platform does not collect the gym’s day-pass payment.</p>{gym.day_pass_information?<div className="my-5 whitespace-pre-wrap rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-4 text-sm">{gym.day_pass_information}</div>:null}<GuestRegistrationForm gymSlug={gym.slug} publicFlow/></div>}

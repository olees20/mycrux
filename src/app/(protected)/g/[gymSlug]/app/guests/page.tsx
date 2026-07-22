import { GuestRegistrationForm } from "@/components/guest-registration-form";
import { requireActiveGymContext } from "@/lib/server/gym-context";

export default async function MemberGuestPage({params}:{params:Promise<{gymSlug:string}>}){const{gymSlug}=await params;const{gym}=await requireActiveGymContext({gymSlug});return <div className="mx-auto max-w-3xl"><p className="app-eyebrow text-[var(--muted)]">Guest access</p><h1 className="mt-3 text-4xl font-extrabold tracking-[-.035em]">Register a guest</h1><p className="mt-3 mb-6 text-[var(--muted)]">Create an opaque QR pass and a private waiver link to share with your guest. Payment remains a gym/reception matter.</p><GuestRegistrationForm gymSlug={gym.slug}/></div>}

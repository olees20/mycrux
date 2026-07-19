import Image from "next/image";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { CopyJoinUrl, MemberAccessSettings, PrintMemberAccess } from "@/components/member-access-controls";
import { formatGymCode } from "@/features/gym-access/core";
import { getPublicEnvironment } from "@/env/client";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export default async function MemberAccessPage({ params }: { params: Promise<{ gymSlug: string }> }) {
  const { gymSlug } = await params;
  const { gym } = await requireActiveGymContext({ gymSlug, allowedRoles: ["owner", "staff"] });
  const supabase = await createServerComponentSupabaseClient();
  const { data, error } = await supabase.rpc("get_gym_join_credentials", { target_gym_id: gym.id });
  const credential = data?.[0];
  if (error || !credential) notFound();
  const joinUrl = `${getPublicEnvironment().NEXT_PUBLIC_SITE_URL}/join/${credential.join_identifier}`;
  const qrDataUrl = await QRCode.toDataURL(joinUrl, { errorCorrectionLevel: "H", margin: 4, width: 640, color: { dark: "#17211B", light: "#FFFFFF" } });
  return <div className="mx-auto max-w-6xl"><div className="member-access-print-header"><p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Gym access</p><h1 className="mt-3 text-4xl font-black">Member access</h1><p className="mt-3 max-w-3xl leading-7 text-[var(--muted)]">Members scan, authenticate, confirm the gym, and receive standard member access. This QR code never grants staff permissions.</p></div><div className="mt-8 grid gap-6 lg:grid-cols-[minmax(20rem,1fr)_minmax(0,1fr)]"><section className="member-access-print-card rounded-3xl border border-[var(--border)] bg-white p-6 text-center"><h2 className="text-2xl font-black">Scan to join {gym.name}</h2><div className="mx-auto mt-5 max-w-xl bg-white p-4"><Image alt={`QR code to join ${gym.name} as a MyCrux member`} className="h-auto w-full" height={640} priority src={qrDataUrl} unoptimized width={640}/></div><p className="mt-4 text-sm font-bold">Open your camera, scan, then sign in and confirm.</p><p className="mt-5 text-sm text-[var(--muted)]">Gym code</p><p className="mt-1 font-mono text-3xl font-black tracking-[0.16em]" data-testid="gym-code">{formatGymCode(credential.join_code)}</p><p className="mt-5 break-all text-xs text-[var(--muted)]">{joinUrl}</p></section><aside className="member-access-screen-only space-y-6"><section className={`rounded-2xl p-5 ${credential.enabled ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950"}`}><h2 className="text-xl font-black">{credential.enabled ? "Member joining is enabled" : "Member joining is disabled"}</h2><p className="mt-2 text-sm">Last rotated {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(credential.rotated_at))}.</p></section><section className="rounded-2xl border border-[var(--border)] bg-white p-5"><h2 className="text-xl font-black">Share and print</h2><div className="mt-4 flex flex-wrap gap-3"><CopyJoinUrl joinUrl={joinUrl}/><a className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-5 text-sm font-semibold" download={`${gym.slug}-member-access.png`} href={qrDataUrl}>Download QR</a><PrintMemberAccess/></div></section><section className="rounded-2xl border border-[var(--border)] bg-white p-5"><h2 className="text-xl font-black">Security controls</h2><p className="mt-2 mb-5 text-sm leading-6 text-[var(--muted)]">Disable joining temporarily or rotate both identifiers if a printed code should stop working.</p><MemberAccessSettings enabled={credential.enabled} gymSlug={gym.slug}/></section></aside></div></div>;
}

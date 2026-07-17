import { AppShell } from "@/components/app-shell";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { readableForeground } from "@/features/gyms/validation";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export default async function GymAppLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ gymSlug: string }>;
}>) {
  const { gymSlug } = await params;
  const { gym, gyms } = await requireActiveGymContext({ gymSlug });
  const supabase = await createServerComponentSupabaseClient();
  const { data: branding } = await supabase.from("gym_branding").select("primary_colour,accent_colour,background_colour,logo_path").eq("gym_id", gym.id).maybeSingle();
  const logoUrl = branding?.logo_path ? (await supabase.storage.from("gym-branding").createSignedUrl(branding.logo_path, 60 * 60)).data?.signedUrl : undefined;
  return <AppShell branding={branding ? { primaryColour: branding.primary_colour, accentColour: branding.accent_colour, backgroundColour: branding.background_colour, accentForeground: readableForeground(branding.accent_colour), logoUrl } : undefined} gym={gym} gyms={gyms}>{children}</AppShell>;
}

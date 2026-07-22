import { AppShell } from "@/components/app-shell";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export default async function GymStaffLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ gymSlug: string }> }>) {
  const { gymSlug } = await params;
  const { gym, gyms } = await requireActiveGymContext({ gymSlug, allowedRoles: ["owner", "staff", "route_setter"] });
  const supabase = await createServerComponentSupabaseClient();
  const [{ data: branding }, { data: membership }] = await Promise.all([
    supabase.from("gym_branding").select("primary_colour,accent_colour,background_colour,logo_path").eq("gym_id", gym.id).maybeSingle(),
    gym.role === "staff" ? supabase.from("gym_memberships").select("staff_role_id").eq("id", gym.membershipId).single() : Promise.resolve({ data: null }),
  ]);
  const { data: staffRole } = membership?.staff_role_id ? await supabase.from("staff_roles").select("capabilities").eq("id", membership.staff_role_id).single() : { data: null };
  const logoUrl = branding?.logo_path ? (await supabase.storage.from("gym-branding").createSignedUrl(branding.logo_path, 3600)).data?.signedUrl : undefined;
  return <AppShell branding={branding ? { primaryColour: branding.primary_colour, accentColour: branding.accent_colour, backgroundColour: branding.background_colour, accentForeground: "#17211b", logoUrl } : undefined} capabilities={staffRole?.capabilities ?? []} gym={gym} gyms={gyms} mode="staff">{children}</AppShell>;
}
